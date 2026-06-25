import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';
import { recommendAlbum, recommendByGenre } from '@/lib/recommend/engine';
import { isKnownGenre } from '@/lib/recommend/genres';

export async function GET(req: NextRequest) {
    const session = await getSessionFromCookies();
    if (!session.username) {
        return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });
    }

    const discoveryParam = req.nextUrl.searchParams.get('discovery');
    const discovery = discoveryParam !== null ? Number(discoveryParam) : 0.4;

    const genre = req.nextUrl.searchParams.get('genre');
    if (genre !== null && !isKnownGenre(genre)) {
        return NextResponse.json({ error: 'unknown_genre' }, { status: 400 });
    }

    try {
        const album = genre
            ? await recommendByGenre(session.username, discovery, genre)
            : await recommendAlbum(session.username, discovery);
        return NextResponse.json(album);
    } catch (err) {
        // Log details server-side; return a generic message so we don't leak
        // internals (env var names, upstream URLs) to the client.
        console.error('recommend failed:', err);
        return NextResponse.json({ error: 'pick_failed' }, { status: 502 });
    }
}
