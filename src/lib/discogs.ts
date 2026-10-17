// Discogs database search client — the data source of the album search mode,
// which uses no Last.fm account. Anonymous access allows 25 requests/min per IP;
// an optional free token (`DISCOGS_TOKEN`) raises that to 60. Requests go through
// their own limiter queue, and result pages are cached for 1h.

import { cached } from '@/lib/cache';
import { createRateLimiter } from '@/lib/lastfm/limiter';

const API_ROOT = 'https://api.discogs.com';
const PAGE_TTL_MS = 60 * 60 * 1000;
const PER_PAGE = 50;
const RETRY_DELAY_MS = 3000;

export interface DiscogsMaster {
    id: number;
    title: string; // "Artist - Album"
    year?: string;
    country?: string;
    uri: string; // site path, e.g. /master/123-Artist-Album
    cover_image?: string;
    genre?: string[];
    style?: string[];
    community?: { have?: number; want?: number };
}

export interface DiscogsSearchPage {
    pagination: { page: number; pages: number; items: number };
    results: DiscogsMaster[];
}

// Optional — without it requests are anonymous (lower rate limit).
function getDiscogsToken(): string | undefined {
    return process.env.DISCOGS_TOKEN || undefined;
}

// Discogs requires a User-Agent identifying the app.
function getUserAgent(): string {
    const appUrl = process.env.APP_URL;
    if (!appUrl) {
        throw new Error('APP_URL is not set (add it to .env.local).');
    }
    return `next-album/1.0 +${appUrl}`;
}

let limiter: ReturnType<typeof createRateLimiter> | null = null;

// Space requests under the limit: 60/min with a token, 25/min without. Created
// lazily so the token is read at call time, like the other env getters.
function rateLimited<T>(fn: () => Promise<T>): Promise<T> {
    limiter ??= createRateLimiter(getDiscogsToken() ? 1000 : 2400);
    return limiter(fn);
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function discogsGet<T>(path: string, params: Record<string, string>): Promise<T> {
    const url = `${API_ROOT}${path}?${new URLSearchParams(params)}`;
    const headers: Record<string, string> = {
        'User-Agent': getUserAgent(),
        Accept: 'application/json',
    };
    const token = getDiscogsToken();
    if (token) headers.Authorization = `Discogs token=${token}`;

    const request = () => rateLimited(() => fetch(url, { headers, cache: 'no-store' }));
    let res = await request();
    if (res.status === 429) {
        await sleep(RETRY_DELAY_MS);
        res = await request();
    }
    if (!res.ok) throw new Error(`Discogs HTTP ${res.status}`);
    return (await res.json()) as T;
}

/**
 * One page of master releases (one entry per album across its editions)
 * matching `filters`, most-collected first. `format=Album` drops singles, EPs
 * and demos. Note anonymous requests get no `cover_image` — Discogs serves
 * images only to authenticated (token) requests.
 */
export function searchMasters(
    filters: Record<string, string>,
    page: number,
): Promise<DiscogsSearchPage> {
    const params = {
        ...filters,
        type: 'master',
        format: 'Album',
        sort: 'have',
        sort_order: 'desc',
        per_page: String(PER_PAGE),
        page: String(page),
    };
    return cached(
        `discogs:search:${new URLSearchParams(params)}`,
        () => discogsGet<DiscogsSearchPage>('/database/search', params),
        PAGE_TTL_MS,
    );
}
