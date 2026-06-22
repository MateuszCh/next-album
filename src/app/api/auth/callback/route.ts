import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/lastfm/auth";
import { getSessionFromCookies } from "@/lib/session";
import { isUserAllowed } from "@/lib/access";

export async function GET(req: NextRequest) {
  const base = process.env.APP_URL ?? req.nextUrl.origin;
  const home = base.replace(/\/$/, "");
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(`${home}/?error=missing_token`);
  }

  try {
    const { username, sessionKey } = await getSession(token);

    // Allowlist: only specific Last.fm accounts are allowed in.
    if (!isUserAllowed(username)) {
      return NextResponse.redirect(`${home}/?error=not_allowed`);
    }

    const session = await getSessionFromCookies();
    session.username = username;
    session.sessionKey = sessionKey;
    await session.save();
    return NextResponse.redirect(home + "/");
  } catch {
    return NextResponse.redirect(`${home}/?error=auth_failed`);
  }
}
