import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { recommend } from '@/lib/recommend/engine';
import { getUserData } from '@/lib/userData';
import type { AlbumRecommendation } from '@/lib/lastfm/types';

// An unreachable database would otherwise stall every roll for the driver's
// 30 s server-selection timeout.
const HISTORY_TIMEOUT_MS = 1500;

/**
 * The user's stored roll history, so recent picks don't come back. Optional: a
 * missing, slow or unreachable database just means no exclusion.
 */
function recentRolls(userId: string): Promise<AlbumRecommendation[]> {
    const timeout = new Promise<AlbumRecommendation[]>((resolve) =>
        setTimeout(() => resolve([]), HISTORY_TIMEOUT_MS),
    );
    const history = getUserData(userId)
        .then((d) => d.history)
        .catch(() => []);
    return Promise.race([history, timeout]);
}

/**
 * Last.fm mode: an album from the logged-in user's profile. The only input is
 * the favorites ↔ discovery slider (`discovery`, 0–1); identity comes from the
 * session cookie. Filters live in the album search (`/api/search`).
 */
export async function GET(req: NextRequest) {
    // Needs a Last.fm username: a Last.fm login, or an email account with it linked.
    const user = await getCurrentUser();
    if (!user?.lastfmUsername) {
        return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });
    }

    const discoveryParam = req.nextUrl.searchParams.get('discovery');
    const discovery = discoveryParam !== null ? Number(discoveryParam) : 0.4;

    try {
        const album = await recommend(user.lastfmUsername, {
            discovery,
            recentRolls: await recentRolls(user.userId),
        });
        return NextResponse.json(album);
    } catch (err) {
        // Logged and returned generically so we don't leak internals (env var
        // names, upstream URLs).
        console.error('recommend failed:', err);
        return NextResponse.json({ error: 'pick_failed' }, { status: 502 });
    }
}
