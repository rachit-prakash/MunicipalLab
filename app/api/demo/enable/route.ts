import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const consent = req.cookies.get("cookie-consent")?.value
  if (consent !== "accepted") {
    return NextResponse.json({ error: "Consent required" }, { status: 403 })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set({
    name: "demo",
    value: "1",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
  return res
}


