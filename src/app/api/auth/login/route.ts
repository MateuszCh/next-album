import { NextRequest, NextResponse } from "next/server";
import { buildAuthUrl } from "@/lib/lastfm/auth";
import { OAUTH_NONCE_COOKIE } from "@/lib/oauth";

export async function GET(req: NextRequest) {
  const base = process.env.APP_URL ?? req.nextUrl.origin;
  // Bind this login attempt to the callback with a nonce (login-CSRF defense):
  // it is set as an httpOnly cookie and echoed back through the callback URL.
  const nonce = crypto.randomUUID();
  const callbackUrl = `${base.replace(/\/$/, "")}/api/auth/callback?nonce=${nonce}`;

  const res = NextResponse.redirect(buildAuthUrl(callbackUrl));
  res.cookies.set(OAUTH_NONCE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 minutes to complete login
  });
  return res;
}
