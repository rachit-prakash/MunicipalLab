import type { NextRequest } from "next/server"

type ChatMessage = { role: "system" | "user" | "assistant"; content: string }

export async function POST(req: NextRequest) {
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

		const system: ChatMessage = {
			role: "system",
			content: [
				"You are the Legaside AI Assistant.",
				"Answer concisely based ONLY on the provided context.",
				"If the context is insufficient, say what is missing and ask a clarifying question.",
				"Prefer bullet points, include concrete steps, avoid speculation.",
			].join(" "),
		}

		const contextBlock: ChatMessage | null =
			Array.isArray(context) && context.length > 0
				? {
						role: "system",
						content: `Context:\n${context.map((c) => `- ${c}`).join("\n")}`,
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


