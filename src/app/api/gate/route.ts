import { NextRequest, NextResponse } from "next/server";
import { GATE_COOKIE, gateToken, isGateEnabled } from "@/lib/gate";

export async function POST(req: NextRequest) {
  if (!isGateEnabled()) {
    return NextResponse.json({ ok: true });
  }

  const body = (await req.json().catch(() => ({}))) as { password?: string };
  if (body.password !== process.env.ACCESS_PASSWORD) {
    return NextResponse.json({ error: "Invalid password." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(GATE_COOKIE, await gateToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
