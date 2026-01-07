import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const consent = req.cookies.get("cookie-consent")?.value
  if (consent !== "accepted") {
    return NextResponse.json({ error: "Consent required" }, { status: 403 })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set({
    name: "demo",
    value: "",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 0,
  })
  return res
}


