import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { audit } from "@/lib/audit"
import { query, withTenant } from "@/lib/db"

export async function DELETE(req: NextRequest) {
	try {
		const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
		const userId = (token as any)?.appUserId ?? token?.sub

		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}
		const requestId = req.headers.get("x-request-id") ?? undefined

		// Resolve tenant for this user
		let tenantId: string | null = null
		{
			const t1 = await query(
				`SELECT tenant_id FROM gmail_accounts WHERE user_id = $1 LIMIT 1`,
				[userId]
			)
			if (t1.rows.length > 0) {
				tenantId = t1.rows[0].tenant_id
			} else {
				const t2 = await query(
					`SELECT tenant_id FROM users WHERE id = $1 LIMIT 1`,
					[userId]
				)
				tenantId = t2.rows.length > 0 ? t2.rows[0].tenant_id : null
			}
		}
		if (!tenantId) {
			return NextResponse.json({ error: "No tenant found" }, { status: 404 })
		}

		// Record intent before executing
		await audit({
			tenantId,
			actorUserId: userId,
			action: "user.delete.requested",
			targetType: "user",
			targetId: userId,
			requestId,
		})

		// Cascade cleanup inside tenant transaction
		await withTenant(tenantId, async (client) => {
			// Avoid FK violations first
			await client.query(
				`UPDATE threads SET assignee_id = NULL WHERE assignee_id = $1`,
				[userId]
			)
			// Child tables
			await client.query(
				`DELETE FROM audit_logs WHERE actor_user_id = $1`,
				[userId]
			)
			await client.query(
				`DELETE FROM memberships WHERE user_id = $1`,
				[userId]
			)
			await client.query(
				`DELETE FROM gmail_accounts WHERE user_id = $1`,
				[userId]
			)
			// Finally remove the user
			await client.query(`DELETE FROM users WHERE id = $1`, [userId])
		})

		// Log completion after deletion; omit actorUserId to avoid FK constraint
		await audit({
			tenantId,
			action: "user.delete.completed",
			targetType: "user",
			targetId: userId,
			requestId,
			payload: { userId },
		})

		// Invalidate session cookies and respond 204
		const res = new NextResponse(null, { status: 204 })
		res.cookies.set({
			name: "next-auth.session-token",
			value: "",
			path: "/",
			maxAge: 0,
		})
		res.cookies.set({
			name: "__Secure-next-auth.session-token",
			value: "",
			path: "/",
			maxAge: 0,
		})
		return res
	} catch (err: any) {
		const message = String(err?.message ?? "")
		// Simple FK/constraint detection
		if (message.toLowerCase().includes("constraint")) {
			return NextResponse.json(
				{ error: "Delete blocked by constraints", detail: message },
				{ status: 409 }
			)
		}
		return NextResponse.json(
			{ error: err?.message ?? "Internal error" },
			{ status: 500 }
		)
	}
}


