import { NextRequest, NextResponse } from 'next/server';
import { searchAlbum } from '@/lib/search';
import { isKnownGenre } from '@/lib/recommend/genres';
import { isKnownDecade } from '@/lib/recommend/decades';
import { isKnownCountry } from '@/lib/recommend/countries';

// The filter dimensions share one multi-select pipeline; only the curated list
// each is validated against differs.
const DIMENSIONS = {
    genre: isKnownGenre,
    decade: isKnownDecade,
    country: isKnownCountry,
} as const;

/**
 * Reads a filter dimension as a list: repeated params (`?genre=a&genre=b`) or a
 * comma-separated value (`?genre=a,b`). Unknown/dup tags are dropped so the
 * search only ever sees curated, deduped tags.
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

/**
 * Album search mode: a random album for the genre / decade / country filters,
 * from Discogs. Needs no Last.fm session (the password gate still applies).
 */
export async function GET(req: NextRequest) {
    const sp = req.nextUrl.searchParams;
    try {
        const album = await searchAlbum({
            genres: parseTags(sp, 'genre'),
            decades: parseTags(sp, 'decade'),
            countries: parseTags(sp, 'country'),
        });
        return NextResponse.json(album);
    } catch (err) {
        // `no_matches` is an expected outcome of an over-narrow filter set — a 400
        // the client localizes; anything else is logged and returned generically.
        if (err instanceof Error && err.message === 'no_matches') {
            return NextResponse.json({ error: 'no_matches' }, { status: 400 });
        }
        console.error('search failed:', err);
        return NextResponse.json({ error: 'pick_failed' }, { status: 502 });
    }
}
