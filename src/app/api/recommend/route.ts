import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/session";
import { recommendAlbum } from "@/lib/recommend/engine";

export async function GET(req: NextRequest) {
  const session = await getSessionFromCookies();
  if (!session.username) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const discoveryParam = req.nextUrl.searchParams.get("discovery");
  const discovery = discoveryParam !== null ? Number(discoveryParam) : 0.4;

  try {
    const album = await recommendAlbum(session.username, discovery);
    return NextResponse.json(album);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
