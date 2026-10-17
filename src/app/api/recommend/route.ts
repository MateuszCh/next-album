import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';
import { recommend } from '@/lib/recommend/engine';

/**
 * Last.fm mode: an album from the logged-in user's profile. The only input is
 * the favorites ↔ discovery slider (`discovery`, 0–1); identity comes from the
 * session cookie. Filters live in the album search (`/api/search`).
 */
export async function GET(req: NextRequest) {
    const session = await getSessionFromCookies();
    if (!session.username) {
        return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });
    }

    const discoveryParam = req.nextUrl.searchParams.get('discovery');
    const discovery = discoveryParam !== null ? Number(discoveryParam) : 0.4;

    try {
        const album = await recommend(session.username, { discovery });
        return NextResponse.json(album);
    } catch (err) {
        // Logged and returned generically so we don't leak internals (env var
        // names, upstream URLs).
        console.error('recommend failed:', err);
        return NextResponse.json({ error: 'pick_failed' }, { status: 502 });
    }
}
