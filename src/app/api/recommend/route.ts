import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';
import { recommendAlbum } from '@/lib/recommend/engine';

export async function GET(req: NextRequest) {
    const session = await getSessionFromCookies();
    if (!session.username) {
        return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
    }

    const discoveryParam = req.nextUrl.searchParams.get('discovery');
    const discovery = discoveryParam !== null ? Number(discoveryParam) : 0.4;

    try {
        const album = await recommendAlbum(session.username, discovery);
        return NextResponse.json(album);
    } catch (err) {
        // Log details server-side; return a generic message so we don't leak
        // internals (env var names, upstream URLs) to the client.
        console.error('recommend failed:', err);
        return NextResponse.json(
            { error: 'Could not pick an album right now. Please try again.' },
            { status: 502 },
        );
    }
}
