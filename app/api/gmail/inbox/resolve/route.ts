// debugging purposes lol.
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import { refreshGoogleAccessToken } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return new Response("Unauthorized", { status: 401 })

  const urlObj = req.nextUrl

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

  // fetches the gmail profile to confirm which account the token belongs to
  const profileRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  })
  // gets the gmail profile.
  const profile = profileRes.ok ? await profileRes.json() : null

  // if a specific id is provided, test that id directly (both message and thread)
  const specificIdRaw = urlObj.searchParams.get("id")
  if (specificIdRaw) {
    const trimmed = specificIdRaw.trim()
    const sanitized = trimmed.replace(/[^A-Za-z0-9_-]/g, "")
    // constructs the url to get the message by id.
    const msgUrl = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(sanitized)}`)
    msgUrl.searchParams.set("format", "full")
    // fetches the message by id.
    const msgRes = await fetch(msgUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    })
    // gets the message body.
    const msgBody = await msgRes.text()
    // constructs the url to get the thread by id.
    const threadUrl = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${encodeURIComponent(sanitized)}`)
    threadUrl.searchParams.set("format", "full")
    const threadRes = await fetch(threadUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    })
    const threadBody = await threadRes.text()

    return new Response(
      JSON.stringify(
        {
          profile,
          idDebug: { raw: specificIdRaw, trimmed, sanitized },
          messageFetch: { status: msgRes.status, ok: msgRes.ok, body: truncate(msgBody) },
          threadFetch: { status: threadRes.status, ok: threadRes.ok, body: truncate(threadBody) },
        },
        null,
        2
      ),
      { headers: { "content-type": "application/json" } }
    )
  }

  // inbox msgs only
  const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages")
  listUrl.searchParams.set("maxResults", "10")
  listUrl.searchParams.set("labelIds", "INBOX")
  const listRes = await fetch(listUrl.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  })
  if (!listRes.ok) {
    return new Response(await listRes.text(), { status: listRes.status })
  }
  const listJson = await listRes.json()
  const messages: Array<{ id: string; threadId: string }> = listJson.messages ?? []

  // trying to resolve each message id directly ITS NOT FUCKIBNG WORKING.
  const results = await Promise.all(
    messages.slice(0, 5).map(async (m) => {
      const id = (m.id ?? "").trim().replace(/[^A-Za-z0-9_-]/g, "")
      const msgUrl = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(id)}`)
      msgUrl.searchParams.set("format", "full")
      const msgRes = await fetch(msgUrl.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      })
      let msgBody: any = null
      try {
        msgBody = await msgRes.text()
      } catch {}
      return {
        id: m.id,
        threadId: m.threadId,
        resolvedId: id,
        status: msgRes.status,
        ok: msgRes.ok,
        body: typeof msgBody === "string" ? (msgBody.length > 400 ? msgBody.slice(0, 400) + "…" : msgBody) : null,
      }
    })
  )

  return new Response(JSON.stringify({ profile, results }, null, 2), {
    headers: { "content-type": "application/json" },
  })
}

function truncate(text: string, max: number = 400) {
  return text.length > max ? text.slice(0, max) + "…" : text
}



