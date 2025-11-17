import { NextResponse } from "next/server"

export const runtime = 'edge';

export async function POST() {
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


