import { NextRequest, NextResponse } from "next/server";
import { GATE_COOKIE, gateToken, isGateEnabled, tokensEqual } from "@/lib/gate";

// Paths reachable without passing the gate (the gate itself + its endpoint).
const PUBLIC_PATHS = ["/gate", "/api/gate"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

export async function middleware(req: NextRequest) {
  // Gate disabled (no ACCESS_PASSWORD) → let everything through.
  if (!isGateEnabled()) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const cookie = req.cookies.get(GATE_COOKIE)?.value;
  const expected = await gateToken();
  if (cookie && tokensEqual(cookie, expected)) {
    return NextResponse.next();
  }

  // No valid gate cookie.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Access denied." }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/gate";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next.js static assets and images.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
