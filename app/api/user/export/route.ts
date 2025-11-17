import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { audit } from "@/lib/audit"
import { query, withTenant } from "@/lib/db"

export async function GET(req: NextRequest) {
	try {
		const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
		if (!token?.sub) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
		}
		const userId = token.sub as string
		const requestId = req.headers.get("x-request-id") ?? undefined

		// Resolve tenant for this user (prefer gmail_accounts, fallback to users)
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

		const result = await withTenant(tenantId, async (client) => {
			// Only personal data for requester (GDPR scope limited to the user)
			const userRes = await client.query(
				`SELECT id, tenant_id, email, display_name, created_at, updated_at
         FROM users
         WHERE id = $1 AND tenant_id = $2
         LIMIT 1`,
				[userId, tenantId]
			)
			const user = userRes.rows[0] ?? null

			const gaRes = await client.query(
				`SELECT user_id, tenant_id, email, encrypted_refresh_token, history_id, last_sync_at, created_at, updated_at
         FROM gmail_accounts
         WHERE user_id = $1 AND tenant_id = $2
         LIMIT 1`,
				[userId, tenantId]
			)
			const gmailAccountRaw = gaRes.rows[0] ?? null
			const gmail_account = gmailAccountRaw
				? {
						...gmailAccountRaw,
						// Ensure bytea is serializable
						encrypted_refresh_token: gmailAccountRaw.encrypted_refresh_token
							? Buffer.from(gmailAccountRaw.encrypted_refresh_token).toString("base64")
							: null,
				  }
				: null

			const membershipsRes = await client.query(
				`SELECT user_id, role_id
         FROM memberships
         WHERE user_id = $1`,
				[userId]
			)
			const memberships = membershipsRes.rows

			const auditRes = await client.query(
				`SELECT id, tenant_id, actor_user_id, action, target_type, target_id, request_id, payload, created_at
         FROM audit_logs
         WHERE actor_user_id = $1
         ORDER BY created_at DESC`,
				[userId]
			)
			const audit_logs = auditRes.rows

			return { user, gmail_account, memberships, audit_logs }
		})

		// Log export
		await audit({
			tenantId,
			actorUserId: userId,
			action: "user.export",
			targetType: "user",
			targetId: userId,
			requestId,
			payload: { counts: {
				memberships: result.memberships?.length ?? 0,
				audit_logs: result.audit_logs?.length ?? 0,
			}},
		})

		return NextResponse.json({
			exportedAt: new Date().toISOString(),
			// Scope note: Only personal data for the requester is exported per GDPR request scope.
			...result,
		})
	} catch (err: any) {
		return NextResponse.json(
			{ error: err?.message ?? "Internal error" },
			{ status: 500 }
		)
	}
}


