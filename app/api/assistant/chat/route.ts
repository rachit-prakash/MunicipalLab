import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import { audit } from "@/lib/audit"
import { checkRateLimit, RateLimits } from "@/lib/rateLimit"
import { retrieveEmailContext, formatRAGContextForLLM, getEmailAnalytics, isAnalyticsQuery } from "@/lib/rag"

type ChatMessage = { role: "system" | "user" | "assistant"; content: string }

export async function POST(req: NextRequest) {
	// Check rate limit
	const rateLimitResponse = await checkRateLimit(req, RateLimits.CHATBOT)
	if (rateLimitResponse) {
		return rateLimitResponse
	}

	try {
		const body = await req.json().catch(() => ({}))
		const messages = (body?.messages ?? []) as ChatMessage[]
		const context = (body?.context ?? []) as string[]
		const model = (body?.model as string) || "gpt-4o-mini"
		const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY

		if (!Array.isArray(messages) || messages.length === 0) {
			return new Response(JSON.stringify({ error: "messages array required" }), {
				status: 400,
				headers: { "content-type": "application/json" },
			})
		}
		if (!apiKey) {
			return new Response(JSON.stringify({ error: "Missing API key" }), {
				status: 500,
				headers: { "content-type": "application/json" },
			})
		}

		// Get user info for tenant-specific RAG
		// The JWT token stores appUserId (UUID) and tenantId directly from the auth flow
		const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
		const userId = (token as any)?.appUserId as string | undefined
		const tenantId = (token as any)?.tenantId as string | undefined

		// RAG: Retrieve relevant email context
		let ragContext = ""
		let analyticsData = null

		if (tenantId && messages.length > 0) {
			try {
				const lastUserMessage = messages[messages.length - 1]
				if (lastUserMessage.role === "user") {
					const userQuery = lastUserMessage.content

					// Check if this is an analytics query
					if (isAnalyticsQuery(userQuery)) {
						// Parse date ranges and filters from query
						const now = new Date()
						let startDate: Date | undefined
						let endDate: Date | undefined

						// Simple date parsing (you can make this more sophisticated)
						if (userQuery.toLowerCase().includes("today")) {
							startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
							endDate = now
						} else if (userQuery.toLowerCase().includes("this week")) {
							const dayOfWeek = now.getDay()
							startDate = new Date(now.getTime() - dayOfWeek * 24 * 60 * 60 * 1000)
							startDate.setHours(0, 0, 0, 0)
							endDate = now
						} else if (userQuery.toLowerCase().includes("this month")) {
							startDate = new Date(now.getFullYear(), now.getMonth(), 1)
							endDate = now
						} else if (userQuery.toLowerCase().includes("last week")) {
							const dayOfWeek = now.getDay()
							endDate = new Date(now.getTime() - dayOfWeek * 24 * 60 * 60 * 1000)
							endDate.setHours(23, 59, 59, 999)
							startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)
							startDate.setHours(0, 0, 0, 0)
						}

						analyticsData = await getEmailAnalytics(tenantId, { startDate, endDate })

						// Format analytics for the LLM
						ragContext = `## Email Analytics\n\n`
						ragContext += `Total Messages: ${analyticsData.totalMessages}\n`
						ragContext += `Total Threads: ${analyticsData.totalThreads}\n\n`

						if (Object.keys(analyticsData.byTopic).length > 0) {
							ragContext += `### By Topic:\n`
							Object.entries(analyticsData.byTopic).forEach(([topic, count]) => {
								ragContext += `- ${topic}: ${count} emails\n`
							})
							ragContext += `\n`
						}

						ragContext += `### By Sentiment:\n`
						ragContext += `- Positive: ${analyticsData.bySentiment.positive}\n`
						ragContext += `- Neutral: ${analyticsData.bySentiment.neutral}\n`
						ragContext += `- Negative: ${analyticsData.bySentiment.negative}\n\n`

						if (Object.keys(analyticsData.byUrgency).length > 0) {
							ragContext += `### By Urgency:\n`
							Object.entries(analyticsData.byUrgency).forEach(([level, count]) => {
								ragContext += `- ${level}: ${count} emails\n`
							})
							ragContext += `\n`
						}

						if (analyticsData.topSenders.length > 0) {
							ragContext += `### Top Senders:\n`
							analyticsData.topSenders.slice(0, 5).forEach((sender, i) => {
								ragContext += `${i + 1}. ${sender.email}: ${sender.count} emails\n`
							})
						}
					} else {
						// Semantic search
						const emailContext = await retrieveEmailContext(userQuery, tenantId, {
							maxMessages: 5,
							maxThreads: 3,
							minSimilarity: 0.5,
						})
						ragContext = formatRAGContextForLLM(emailContext)
					}
				}
			} catch (error) {
				console.error("RAG retrieval error:", error)
				// Continue without RAG context if it fails
			}
		}

		const system: ChatMessage = {
			role: "system",
			content: [
				"You are the Legaside AI Assistant, an intelligent email management assistant.",
				"You have access to the user's email data through semantic search.",
				"When answering questions, use the provided email context and analytics.",
				"Be specific and cite relevant emails when possible (e.g., 'In the email from John on Dec 1st...').",
				"If the context doesn't contain enough information, acknowledge this and explain what additional information you'd need.",
				"For analytics questions, provide clear numbers and insights.",
				"Be helpful, concise, and professional.",
			].join(" "),
		}

		// Combine RAG context with any additional context provided
		const contextParts: string[] = []
		if (ragContext) {
			contextParts.push(ragContext)
		}
		if (Array.isArray(context) && context.length > 0) {
			contextParts.push(context.map((c) => `- ${c}`).join("\n"))
		}

		const contextBlock: ChatMessage | null =
			contextParts.length > 0
				? {
						role: "system",
						content: `## Available Context\n\n${contextParts.join("\n\n")}`,
				  }
				: null

		const finalMessages = [system, ...(contextBlock ? [contextBlock] : []), ...messages]

		// Prefer OpenAI; fall back to OpenRouter if OPENAI_API_KEY not provided
		const isOpenRouter = !process.env.OPENAI_API_KEY && !!process.env.OPENROUTER_API_KEY
		const url = isOpenRouter
			? "https://openrouter.ai/api/v1/chat/completions"
			: "https://api.openai.com/v1/chat/completions"
		const authHeader = isOpenRouter ? `Bearer ${apiKey}` : `Bearer ${apiKey}`

		const res = await fetch(url, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				authorization: authHeader,
				...(isOpenRouter ? { "HTTP-Referer": "https://legaside.app", "X-Title": "Legaside Assistant" } : {}),
			},
			body: JSON.stringify({
				model,
				messages: finalMessages,
				temperature: 0.2,
			}),
		})

		if (!res.ok) {
			const text = await res.text()
			return new Response(JSON.stringify({ error: text || "Upstream error" }), {
				status: res.status,
				headers: { "content-type": "application/json" },
			})
		}

		const data = await res.json()
		const content: string =
			data?.choices?.[0]?.message?.content ??
			data?.choices?.[0]?.delta?.content ??
			"Sorry, I couldn't generate a response."

		// best-effort audit (non-blocking)
		try {
			if (tenantId && userId) {
				await audit({
					tenantId,
					actorUserId: userId,
					action: "assistant.chat",
					requestId: req.headers.get("x-request-id") ?? undefined,
					payload: {
						model,
						messageCount: finalMessages.length,
						usedRAG: !!ragContext,
						isAnalytics: !!analyticsData,
					},
				})
			}
		} catch {}

		return new Response(JSON.stringify({ role: "assistant", content }), {
			headers: { "content-type": "application/json" },
		})
	} catch (err: any) {
		return new Response(JSON.stringify({ error: err?.message ?? "Unexpected error" }), {
			status: 500,
			headers: { "content-type": "application/json" },
		})
	}
}


