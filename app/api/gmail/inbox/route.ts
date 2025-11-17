import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import { refreshGoogleAccessToken } from "@/lib/auth"
import { demoMessages } from "@/lib/demo"
import { audit } from "@/lib/audit"
import { query } from "@/lib/db"

export async function GET(req: NextRequest) {
  const isDemo =
    req.nextUrl.searchParams.get("demo") === "1" ||
    req.cookies.get("demo")?.value === "1" ||
    process.env.DEMO_MODE === "1"

  if (isDemo) {
    const messages = demoMessages.map((m) => ({ id: m.id, threadId: m.threadId }))
    // best-effort audit
    ;(async () => {
      try {
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
        const userId = token?.sub as string | undefined
        let tenantId: string | undefined
        if (userId) {
          const t = await query(`SELECT tenant_id FROM gmail_accounts WHERE user_id = $1 LIMIT 1`, [userId])
          if (t.rows.length > 0) tenantId = t.rows[0].tenant_id
        }
        if (tenantId) {
          await audit({
            tenantId,
            actorUserId: userId,
            action: "gmail.inbox.read",
            requestId: req.headers.get("x-request-id") ?? undefined,
            payload: { source: "demo", count: messages.length },
          })
        }
      } catch {}
    })()
    return new Response(JSON.stringify({ messages, resultSizeEstimate: messages.length }, null, 2), {
      headers: { "content-type": "application/json", "x-demo": "1" },
    })
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return new Response("Unauthorized", { status: 401 })

  let accessToken = (token as any).accessToken as string | undefined
  const accessTokenExpires = (token as any).accessTokenExpires as number | undefined
  const refreshToken = (token as any).refreshToken as string | undefined

  const isExpired = typeof accessTokenExpires === "number" && Date.now() >= accessTokenExpires
  if ((!accessToken || isExpired) && refreshToken) {
    const refreshed = await refreshGoogleAccessToken({ refreshToken })
    if (!refreshed.accessToken) return new Response("Unauthorized", { status: 401 })
    accessToken = refreshed.accessToken as string
  }
  if (!accessToken) return new Response("Unauthorized", { status: 401 })

  const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages")
  url.searchParams.set("maxResults", "25")
  url.searchParams.set("labelIds", "INBOX")

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  })

  if (!res.ok) return new Response(await res.text(), { status: res.status })

  const bodyText = await res.text()
  // best-effort audit
  ;(async () => {
    try {
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
      const userId = token?.sub as string | undefined
      let tenantId: string | undefined
      if (userId) {
        const t = await query(`SELECT tenant_id FROM gmail_accounts WHERE user_id = $1 LIMIT 1`, [userId])
        if (t.rows.length > 0) tenantId = t.rows[0].tenant_id
      }
      if (tenantId) {
        await audit({
          tenantId,
          actorUserId: userId,
          action: "gmail.inbox.read",
          requestId: req.headers.get("x-request-id") ?? undefined,
          payload: { source: "live" },
        })
      }
    } catch {}
  })()
  return new Response(bodyText, { headers: { "content-type": "application/json" } })
}

