/**
 * Chat history API routes
 * Handles saving and loading chat sessions
 */

import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import { withTenant } from "@/lib/db"
import { checkRateLimit, RateLimits } from "@/lib/rateLimit"

export async function GET(req: NextRequest) {
	// Check rate limit
	const rateLimitResponse = await checkRateLimit(req, RateLimits.CHATBOT)
	if (rateLimitResponse) {
		return rateLimitResponse
	}

	try {
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

		// Get all chat sessions for this user
		const sessions = await withTenant(tenantId, async (client) => {
			const result = await client.query(
				`
        SELECT id, title, created_at, updated_at
        FROM chat_sessions
        WHERE user_id = $1
        ORDER BY updated_at DESC
        LIMIT 50
      `,
				[userId]
			)
			return result.rows
		})

		return new Response(JSON.stringify({ sessions }), {
			headers: { "content-type": "application/json" },
		})
	} catch (err: any) {
		console.error("Error fetching chat sessions:", err)
		return new Response(JSON.stringify({ error: err?.message ?? "Unexpected error" }), {
			status: 500,
			headers: { "content-type": "application/json" },
		})
	}
}

export async function POST(req: NextRequest) {
	// Check rate limit
	const rateLimitResponse = await checkRateLimit(req, RateLimits.CHATBOT)
	if (rateLimitResponse) {
		return rateLimitResponse
	}

	try {
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
		const { title } = body

		// Create a new chat session
		const session = await withTenant(tenantId, async (client) => {
			const result = await client.query(
				`
        INSERT INTO chat_sessions (tenant_id, user_id, title)
        VALUES ($1, $2, $3)
        RETURNING id, title, created_at, updated_at
      `,
				[tenantId, userId, title || "New Chat"]
			)
			return result.rows[0]
		})

		return new Response(JSON.stringify({ session }), {
			headers: { "content-type": "application/json" },
		})
	} catch (err: any) {
		console.error("Error creating chat session:", err)
		return new Response(JSON.stringify({ error: err?.message ?? "Unexpected error" }), {
			status: 500,
			headers: { "content-type": "application/json" },
		})
	}
}

