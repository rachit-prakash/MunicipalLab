/**
 * Individual chat session API
 * Get messages, save messages, update title, delete session
 */

import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import { withTenant } from "@/lib/db"
import { checkRateLimit, RateLimits } from "@/lib/rateLimit"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
	// Check rate limit
	const rateLimitResponse = await checkRateLimit(req, RateLimits.CHATBOT)
	if (rateLimitResponse) {
		return rateLimitResponse
	}

	try {
		const sessionId = params.id

		// Get user info
		const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
		const userId = (token as any)?.appUserId as string | undefined
		const tenantId = (token as any)?.tenantId as string | undefined

		if (!userId || !tenantId) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { "content-type": "application/json" },
			})
		}

		// Get session and messages
		const data = await withTenant(tenantId, async (client) => {
			// Verify user owns this session
			const sessionResult = await client.query(
				`
        SELECT id, title, created_at, updated_at
        FROM chat_sessions
        WHERE id = $1 AND user_id = $2
      `,
				[sessionId, userId]
			)

			if (sessionResult.rows.length === 0) {
				throw new Error("Session not found")
			}

			// Get messages
			const messagesResult = await client.query(
				`
        SELECT id, role, content, created_at
        FROM chat_messages
        WHERE session_id = $1
        ORDER BY created_at ASC
      `,
				[sessionId]
			)

			return {
				session: sessionResult.rows[0],
				messages: messagesResult.rows,
			}
		})

		return new Response(JSON.stringify(data), {
			headers: { "content-type": "application/json" },
		})
	} catch (err: any) {
		console.error("Error fetching chat session:", err)
		return new Response(JSON.stringify({ error: err?.message ?? "Unexpected error" }), {
			status: 500,
			headers: { "content-type": "application/json" },
		})
	}
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
	// Check rate limit
	const rateLimitResponse = await checkRateLimit(req, RateLimits.CHATBOT)
	if (rateLimitResponse) {
		return rateLimitResponse
	}

	try {
		const sessionId = params.id

		// Get user info
		const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
		const userId = (token as any)?.appUserId as string | undefined
		const tenantId = (token as any)?.tenantId as string | undefined

		if (!userId || !tenantId) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { "content-type": "application/json" },
			})
		}

		const body = await req.json().catch(() => ({}))
		const { role, content } = body

		if (!role || !content) {
			return new Response(JSON.stringify({ error: "role and content required" }), {
				status: 400,
				headers: { "content-type": "application/json" },
			})
		}

		// Save message and update session
		const message = await withTenant(tenantId, async (client) => {
			// Verify user owns this session
			const sessionResult = await client.query(
				`SELECT id FROM chat_sessions WHERE id = $1 AND user_id = $2`,
				[sessionId, userId]
			)

			if (sessionResult.rows.length === 0) {
				throw new Error("Session not found")
			}

			// Insert message
			const messageResult = await client.query(
				`
        INSERT INTO chat_messages (session_id, role, content)
        VALUES ($1, $2, $3)
        RETURNING id, role, content, created_at
      `,
				[sessionId, role, content]
			)

			// Update session timestamp
			await client.query(`UPDATE chat_sessions SET updated_at = now() WHERE id = $1`, [sessionId])

			// If this is the first user message, update the session title
			const messageCount = await client.query(`SELECT COUNT(*) FROM chat_messages WHERE session_id = $1`, [
				sessionId,
			])

			if (parseInt(messageCount.rows[0].count) === 1 && role === "user") {
				const title = content.slice(0, 50) + (content.length > 50 ? "..." : "")
				await client.query(`UPDATE chat_sessions SET title = $1 WHERE id = $2`, [title, sessionId])
			}

			return messageResult.rows[0]
		})

		return new Response(JSON.stringify({ message }), {
			headers: { "content-type": "application/json" },
		})
	} catch (err: any) {
		console.error("Error saving message:", err)
		return new Response(JSON.stringify({ error: err?.message ?? "Unexpected error" }), {
			status: 500,
			headers: { "content-type": "application/json" },
		})
	}
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
	try {
		const sessionId = params.id

		// Get user info
		const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
		const userId = (token as any)?.appUserId as string | undefined
		const tenantId = (token as any)?.tenantId as string | undefined

		if (!userId || !tenantId) {
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { "content-type": "application/json" },
			})
		}

		// Delete session
		await withTenant(tenantId, async (client) => {
			await client.query(`DELETE FROM chat_sessions WHERE id = $1 AND user_id = $2`, [sessionId, userId])
		})

		return new Response(JSON.stringify({ success: true }), {
			headers: { "content-type": "application/json" },
		})
	} catch (err: any) {
		console.error("Error deleting session:", err)
		return new Response(JSON.stringify({ error: err?.message ?? "Unexpected error" }), {
			status: 500,
			headers: { "content-type": "application/json" },
		})
	}
}

