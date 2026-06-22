import { NextRequest, NextResponse } from "next/server";
import { buildAuthUrl } from "@/lib/lastfm/auth";

export async function GET(req: NextRequest) {
  const base = process.env.APP_URL ?? req.nextUrl.origin;
  const callbackUrl = `${base.replace(/\/$/, "")}/api/auth/callback`;
  return NextResponse.redirect(buildAuthUrl(callbackUrl));
}
