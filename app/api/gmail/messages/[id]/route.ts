import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import { refreshGoogleAccessToken } from "@/lib/auth"
import { demoMessages } from "@/lib/demo"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const urlObj = req.nextUrl
  const debug = urlObj.searchParams.get("debug") === "1"
  const isDemo =
    urlObj.searchParams.get("demo") === "1" ||
    req.cookies.get("demo")?.value === "1" ||
    process.env.DEMO_MODE === "1"

  if (isDemo) {
    const awaitedParams = await params
    const id = (awaitedParams?.id ?? "").trim()
    const item = demoMessages.find((m) => m.id === id)
    if (!item) return new Response(JSON.stringify({ error: "Not found" }, null, 2), { status: 404 })
    const message = toGmailMessage(item)
    return new Response(JSON.stringify(message, null, 2), {
      headers: { "content-type": "application/json", "x-demo": "1" },
    })
  }
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return new Response("Unauthorized", { status: 401 })
  // uses /api/gmail/messages/{id} to get the message by id. same shit as threads but different story 🤣
  // checks if the access token is expired and if it is, refreshes it.
  let accessToken = (token as any).accessToken as string | undefined
  const accessTokenExpires = (token as any).accessTokenExpires as number | undefined
  const refreshToken = (token as any).refreshToken as string | undefined
  // checks if the access token is expired and if it is, refreshes it.
  const isExpired = typeof accessTokenExpires === "number" && Date.now() >= accessTokenExpires
  if ((!accessToken || isExpired) && refreshToken) {
    const refreshed = await refreshGoogleAccessToken({ refreshToken })
    if (!refreshed.accessToken) return new Response("Unauthorized", { status: 401 })
    accessToken = refreshed.accessToken as string
  }
  if (!accessToken) return new Response("Unauthorized", { status: 401 })
  // constructs the path to get the message by id.
  const pathTail = urlObj.pathname.split("/api/gmail/messages/")[1] ?? ""
  const pathId = pathTail.split("/")[0] ?? ""
  const awaitedParams = await params
  const rawId = ((awaitedParams?.id) ?? pathId) ?? ""
  const trimmedId = rawId.trim()
  const sanitizedId = trimmedId.replace(/[^A-Za-z0-9_-]/g, "")
  // checks if the sanitized id is valid.
  if (!sanitizedId) {
    // if the sanitized id is not valid, return a 400 error. was for debugging purposes. im not gonna remove this cuz i might need it later.
    const emptyIdPayload = {
      error: "Missing message id",
      idDebug: { rawId, trimmedId, sanitizedId, pathTail, pathId },
      hint: "Call /api/gmail/messages/{messageId}. The resolver at /api/gmail/inbox/resolve can help verify IDs.",
    }
    return new Response(JSON.stringify(emptyIdPayload, null, 2), {
      status: 400,
      headers: { "content-type": "application/json", "x-id-raw": rawId, "x-id-sanitized": sanitizedId },
    })
  }
  // constructs the url to get the message by id.
  const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(sanitizedId)}`)
  url.searchParams.set("format", "full")
  // fetches the message by id.
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  })
  // checks if the message is valid.
  if (res.ok) {
    const bodyText = await res.text()
    if (debug) {
      // if the debug flag is set, return a response with the message body.
      return new Response(
        JSON.stringify(
          { idDebug: { rawId, trimmedId, sanitizedId }, source: "message", body: tryParse(bodyText) ?? bodyText },
          null,
          2
        ),
        { headers: { "content-type": "application/json", "x-id-raw": rawId, "x-id-sanitized": sanitizedId } }
      )
    }
    // if the debug flag is not set, return a response with the message body.
    return new Response(bodyText, {
      headers: { "content-type": "application/json", "x-id-raw": rawId, "x-id-sanitized": sanitizedId },
    })
  }

  // if the provided id was actually a threadId, try resolving the first message in that thread.
  const originalErrorBody = await res.text()
  const threadUrl = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${encodeURIComponent(sanitizedId)}`)
  threadUrl.searchParams.set("format", "full")
  const threadRes = await fetch(threadUrl.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  })
  // checks if the thread is valid.
  if (threadRes.ok) {
    const thread = await threadRes.json()
    // gets the first message id from the thread.
    const firstMessageId = thread?.messages?.[0]?.id as string | undefined
    if (firstMessageId) {
      const msgUrl = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(firstMessageId)}`)
      msgUrl.searchParams.set("format", "full")
      const msgRes = await fetch(msgUrl.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      })
      // checks if the message is valid.
      if (msgRes.ok) {
        const text = await msgRes.text()
        if (debug) {
          return new Response(
            JSON.stringify(
              {
                idDebug: { rawId, trimmedId, sanitizedId },
                source: "thread->message",
                body: tryParse(text) ?? text,
              },
              null,
              2
            ),
            {
              headers: {
                "content-type": "application/json",
                "x-gmail-resolved-from": "thread",
                "x-id-raw": rawId,
                "x-id-sanitized": sanitizedId,
              },
            }
          )
        }
        return new Response(text, {
          headers: {
            "content-type": "application/json",
            "x-gmail-resolved-from": "thread",
            "x-id-raw": rawId,
            "x-id-sanitized": sanitizedId,
          },
        })
      }
      return new Response(await msgRes.text(), { status: msgRes.status })
    }
    // No messages inside thread; return thread for visibility
    return new Response(JSON.stringify({ note: "Resolved id as thread, but no messages found", thread }), {
      headers: { "content-type": "application/json" },
      status: 200,
    })
  }

  // If thread lookup also failed, return a concise diagnostic to help debugging.
  const threadErrorBody = await threadRes.text()
  return new Response(
    JSON.stringify({
      error: "Gmail lookup failed",
      idDebug: { rawId, trimmedId, sanitizedId },
      messageFetch: { status: res.status, body: safeTruncate(originalErrorBody, 2000) },
      threadFetch: { status: threadRes.status, body: safeTruncate(threadErrorBody, 2000) },
    }),
    { headers: { "content-type": "application/json" }, status: res.status }
  )
  // fallback return is unreachable due to the diagnostic above. i'm not gonna remove this cuz i might need it later.
  // return new Response(originalErrorBody, { status: res.status })
}
// debugging purposes.
function safeTruncate(text: string, maxLen: number) {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + "…"
}

// debugging purposes.
function tryParse(text: string) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function toGmailMessage(item: {
  id: string
  threadId: string
  subject: string
  from: string
  date: string
  snippet: string
}) {
  return {
    id: item.id,
    threadId: item.threadId,
    snippet: item.snippet,
    internalDate: String(Date.parse(item.date)),
    payload: {
      headers: [
        { name: "Subject", value: item.subject },
        { name: "From", value: item.from },
        { name: "Date", value: item.date },
      ],
    },
  }
}

