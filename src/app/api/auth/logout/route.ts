import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionFromCookies } from "@/lib/session";
import { GATE_COOKIE } from "@/lib/gate";

export async function POST(req: NextRequest) {
  // Clear our app session (username + Last.fm session key)...
  const session = await getSessionFromCookies();
  session.destroy();

  // ...and the gate cookie, so the access password is required again.
  const cookieStore = await cookies();
  cookieStore.delete(GATE_COOKIE);

  const base = process.env.APP_URL ?? req.nextUrl.origin;
  return NextResponse.json({ ok: true, redirect: base.replace(/\/$/, "") + "/" });
}
