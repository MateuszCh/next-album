import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';
import { recommend } from '@/lib/recommend/engine';
import { isKnownGenre } from '@/lib/recommend/genres';
import { isKnownMood } from '@/lib/recommend/moods';
import { isKnownDecade } from '@/lib/recommend/decades';

// The three tag dimensions share one multi-select pipeline; only the curated
// list each is validated against differs.
const DIMENSIONS = {
    genre: isKnownGenre,
    mood: isKnownMood,
    decade: isKnownDecade,
} as const;

/**
 * Reads a filter dimension as a list: repeated params (`?genre=a&genre=b`) or a
 * comma-separated value (`?genre=a,b`). Unknown/dup tags are dropped so the
 * engine only ever sees curated, deduped tags.
 */
function parseTags(sp: URLSearchParams, key: keyof typeof DIMENSIONS): string[] {
    const isKnown = DIMENSIONS[key];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of sp.getAll(key).flatMap((v) => v.split(','))) {
        const tag = raw.trim();
        const lower = tag.toLowerCase();
        if (tag && isKnown(tag) && !seen.has(lower)) {
            seen.add(lower);
            out.push(tag);
        }
    }
    return out;
}

export async function GET(req: NextRequest) {
    const session = await getSessionFromCookies();
    if (!session.username) {
        return NextResponse.json({ error: 'not_logged_in' }, { status: 401 });
    }

    const sp = req.nextUrl.searchParams;
    const discoveryParam = sp.get('discovery');
    const discovery = discoveryParam !== null ? Number(discoveryParam) : 0.4;

    const genres = parseTags(sp, 'genre');
    const moods = parseTags(sp, 'mood');
    const decades = parseTags(sp, 'decade');
    let now = ['1', 'true'].includes((sp.get('now') ?? '').toLowerCase());

    // Back-compat with the old single-mode client (`dimension` + `tag`).
    const dimension = sp.get('dimension');
    const tag = sp.get('tag');
    if (dimension === 'current') now = true;
    if (dimension && tag) {
        if (dimension === 'genre' && isKnownGenre(tag) && !genres.includes(tag)) genres.push(tag);
        if (dimension === 'mood' && isKnownMood(tag) && !moods.includes(tag)) moods.push(tag);
        if (dimension === 'decade' && isKnownDecade(tag) && !decades.includes(tag)) decades.push(tag);
    }

    try {
        const album = await recommend(session.username, { discovery, genres, moods, decades, now });
        return NextResponse.json(album);
    } catch (err) {
        // `no_matches` is an expected outcome of an over-narrow filter set — a 400
        // the client localizes; anything else is logged and returned generically
        // so we don't leak internals (env var names, upstream URLs).
        if (err instanceof Error && err.message === 'no_matches') {
            return NextResponse.json({ error: 'no_matches' }, { status: 400 });
        }
        console.error('recommend failed:', err);
        return NextResponse.json({ error: 'pick_failed' }, { status: 502 });
    }
}
