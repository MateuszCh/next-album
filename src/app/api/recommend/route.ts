import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';
import { recommendAlbum, recommendByTag, recommendCurrent } from '@/lib/recommend/engine';
import { isKnownGenre, getGenre } from '@/lib/recommend/genres';
import { isKnownMood, getMood } from '@/lib/recommend/moods';
import { isKnownDecade, getDecade } from '@/lib/recommend/decades';

// A "tag dimension" maps a query `dimension` to its validator + label resolver.
// Genre, mood and decade all run the same tag-scoped pipeline (recommendByTag);
// only the curated list they validate against differs.
const TAG_DIMENSIONS = {
    genre: { isKnown: isKnownGenre, label: (t: string) => getGenre(t)?.label ?? t },
    mood: { isKnown: isKnownMood, label: (t: string) => getMood(t)?.label ?? t },
    decade: { isKnown: isKnownDecade, label: (t: string) => getDecade(t)?.label ?? t },
} as const;

export async function GET(req: NextRequest) {
    const session = await getSessionFromCookies();
    if (!session.username) {
        return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });
    }

    const discoveryParam = req.nextUrl.searchParams.get('discovery');
    const discovery = discoveryParam !== null ? Number(discoveryParam) : 0.4;

    // Backward-compat: an old client may still send `genre=<tag>`.
    const legacyGenre = req.nextUrl.searchParams.get('genre');
    const dimension = req.nextUrl.searchParams.get('dimension') ?? (legacyGenre ? 'genre' : null);
    const tag = req.nextUrl.searchParams.get('tag') ?? legacyGenre;

    try {
        if (dimension === 'current') {
            const album = await recommendCurrent(session.username, discovery);
            return NextResponse.json(album);
        }

        if (dimension && dimension in TAG_DIMENSIONS) {
            const { isKnown, label } = TAG_DIMENSIONS[dimension as keyof typeof TAG_DIMENSIONS];
            if (!tag || !isKnown(tag)) {
                return NextResponse.json({ error: 'unknown_genre' }, { status: 400 });
            }
            const album = await recommendByTag(session.username, discovery, tag, label(tag));
            return NextResponse.json(album);
        }

        const album = await recommendAlbum(session.username, discovery);
        return NextResponse.json(album);
    } catch (err) {
        // Log details server-side; return a generic message so we don't leak
        // internals (env var names, upstream URLs) to the client.
        console.error('recommend failed:', err);
        return NextResponse.json({ error: 'pick_failed' }, { status: 502 });
    }
}
