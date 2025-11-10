import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import { refreshGoogleAccessToken } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const isDemo =
    req.nextUrl.searchParams.get("demo") === "1" ||
    req.cookies.get("demo")?.value === "1" ||
    process.env.DEMO_MODE === "1"

  if (isDemo) {
    const messages = demoMessages.map((m) => ({ id: m.id, threadId: m.threadId }))
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
  return new Response(await res.text(), { headers: { "content-type": "application/json" } })
}

// Simple demo data used when demo mode is enabled
const demoMessages = [
  {
    id: "demo-1",
    threadId: "demo-t-1",
    subject: "Healthcare Reform Bill - Constituent Support",
    from: "John Smith <john@example.com>",
    date: new Date(Date.now() - 1000 * 60 * 60 * 12).toUTCString(),
    snippet: "Constituent expressing strong support for the proposed healthcare reform bill...",
  },
  {
    id: "demo-2",
    threadId: "demo-t-2",
    subject: "Immigration Policy Concerns",
    from: "Maria Garcia <maria@example.com>",
    date: new Date(Date.now() - 1000 * 60 * 60 * 24).toUTCString(),
    snippet: "Local business owner expressing concerns about new immigration guidelines...",
  },
  {
    id: "demo-3",
    threadId: "demo-t-3",
    subject: "Infrastructure Investment Support",
    from: "Robert Johnson <robert@example.com>",
    date: new Date(Date.now() - 1000 * 60 * 60 * 48).toUTCString(),
    snippet: "Requesting funding for local infrastructure projects...",
  },
  {
    id: "demo-4",
    threadId: "demo-t-4",
    subject: "Education Funding Request",
    from: "Susan Williams <susan@example.com>",
    date: new Date(Date.now() - 1000 * 60 * 60 * 72).toUTCString(),
    snippet: "Advocating for increased education funding...",
  },
  {
    id: "demo-5",
    threadId: "demo-t-5",
    subject: "Environmental Protection Concerns",
    from: "David Chen <david@example.com>",
    date: new Date(Date.now() - 1000 * 60 * 60 * 96).toUTCString(),
    snippet: "Opposing proposed industrial development near protected areas...",
  },
]


