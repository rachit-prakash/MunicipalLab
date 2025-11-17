import { NextResponse } from "next/server"

export const runtime = 'edge';

export async function POST() {
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


