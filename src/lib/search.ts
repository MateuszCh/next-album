// Album search mode: a random album matching genre / decade / country filters,
// drawn from Discogs — no Last.fm account involved. OR within a dimension (each
// roll draws one selected value per dimension), AND across dimensions (they
// combine into one Discogs query).

import { searchMasters, type DiscogsMaster } from '@/lib/discogs';
import { GENRES, getGenre } from '@/lib/recommend/genres';
import { getDecade } from '@/lib/recommend/decades';
import { getCountry } from '@/lib/recommend/countries';
import { weightedPick } from '@/lib/recommend/weighted';
import { getAlbumInfo } from '@/lib/lastfm/album';
import { resolveCover } from '@/lib/coverart';
import type { AlbumRecommendation } from '@/lib/lastfm/types';

// Draw from the most-collected albums only: the first pages (50 each), ~500,
// with earlier pages likelier (weight 1/page) — deep pages of a niche filter
// hold albums only a handful of people own.
const MAX_PAGES = 10;

// An OR selection can hold an empty combination; redraw a few times.
const MAX_ATTEMPTS = 3;

const DISCOGS_WEB = 'https://www.discogs.com';

export interface SearchOptions {
    genres: string[];
    decades: string[];
    countries: string[];
}

function pickOne<T>(items: T[]): T | undefined {
    return items[Math.floor(Math.random() * items.length)];
}

/**
 * One Discogs query for this roll: a random value from each selected dimension
 * (and a random variant of the genre). `tags` are the drawn filter tags, for the
 * reason. With no filters at all it draws a random genre rather than everything.
 */
function drawQuery(opts: SearchOptions): { query: Record<string, string>; tags: string[] } {
    const query: Record<string, string> = {};
    const tags: string[] = [];
    const noFilters =
        opts.genres.length === 0 && opts.decades.length === 0 && opts.countries.length === 0;

    const genreTag = noFilters ? pickOne(GENRES)?.tag : pickOne(opts.genres);
    const genre = genreTag ? getGenre(genreTag) : undefined;
    if (genre) {
        const variant = pickOne(genre.discogs);
        if (variant?.genre) query.genre = variant.genre;
        if (variant?.style) query.style = variant.style;
        if (!noFilters) tags.push(genre.tag);
    }

    const decadeTag = pickOne(opts.decades);
    const decade = decadeTag ? getDecade(decadeTag) : undefined;
    if (decade) {
        query.year = `${decade.from}-${decade.from + 9}`;
        tags.push(decade.tag);
    }

    const countryTag = pickOne(opts.countries);
    const country = countryTag ? getCountry(countryTag) : undefined;
    if (country) {
        query.country = country.discogs;
        tags.push(country.tag);
    }

    return { query, tags };
}

// Discogs disambiguates artist names with a numeric suffix ("IGS (2)") and marks
// name variations with "*" ("Ten Typ Mes*").
function cleanArtist(name: string): string {
    return name
        .replace(/\*$/, '')
        .replace(/\s\(\d+\)$/, '')
        .trim();
}

/**
 * The Discogs cover when present (only for token requests; "spacer.gif" means
 * none), else Last.fm's album art — API key only, no account — with the Cover
 * Art Archive fallback of `resolveCover`.
 */
async function coverFor(master: DiscogsMaster, artist: string, name: string) {
    const cover = master.cover_image;
    if (cover && !cover.includes('spacer.gif')) return cover;
    try {
        const info = await getAlbumInfo(artist, name);
        return await resolveCover(info?.imageUrl ?? null, info?.mbid ?? null);
    } catch {
        return null;
    }
}

async function toRecommendation(
    master: DiscogsMaster,
    tags: string[],
): Promise<AlbumRecommendation> {
    // Titles are "Artist - Album"; callers only pass titles containing " - ".
    const sep = master.title.indexOf(' - ');
    const name = master.title.slice(sep + 3);
    const artist = cleanArtist(master.title.slice(0, sep));
    return {
        name,
        artist,
        url: `${DISCOGS_WEB}${master.uri}`,
        imageUrl: await coverFor(master, artist, name),
        mode: 'search',
        source: 'discogs',
        reason: { kind: 'search', filters: tags, have: master.community?.have ?? 0 },
        playcount: null,
        year: Number(master.year) || null,
    };
}

/**
 * A random album for the given filters: one Discogs query per roll, a random
 * page among the most-collected albums (earlier pages likelier), then an album
 * weighted by `sqrt(have)` so the very top doesn't dominate. Throws
 * `no_matches` when the filters match nothing.
 */
export async function searchAlbum(opts: SearchOptions): Promise<AlbumRecommendation> {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const { query, tags } = drawQuery(opts);
        const first = await searchMasters(query, 1);
        const pages = Math.min(first.pagination.pages, MAX_PAGES);
        if (pages === 0) continue;

        const pageNumbers = Array.from({ length: pages }, (_, i) => i + 1);
        const page = weightedPick(pageNumbers, (p) => 1 / p) ?? 1;
        const { results } = page === 1 ? first : await searchMasters(query, page);
        const albums = results.filter((m) => m.title.includes(' - '));
        const master = weightedPick(albums, (m) => Math.sqrt(m.community?.have ?? 0) + 1);
        if (master) return await toRecommendation(master, tags);
    }
    throw new Error('no_matches');
}
