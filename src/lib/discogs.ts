// Discogs database search client — the data source of the album search mode,
// which uses no Last.fm account. Anonymous access allows 25 requests/min per IP;
// an optional free token (`DISCOGS_TOKEN`) raises that to 60. Requests go through
// their own limiter queue, and result pages (slimmed) and page counts are cached
// for 7 days in memory and MongoDB — the `sort=have` ranking moves slowly.

import { persistentCached } from '@/lib/persistentCache';
import { createRateLimiter } from '@/lib/lastfm/limiter';
import { getUserAgent, UPSTREAM_TIMEOUT_MS } from '@/lib/userAgent';

const API_ROOT = 'https://api.discogs.com';
const PAGE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const PER_PAGE = 50;
const RETRY_DELAY_MS = 3000;

// Only the fields the search uses — pages are slimmed to these before caching.
export interface DiscogsMaster {
    id: number;
    title: string; // "Artist - Album"
    year?: string;
    uri: string; // site path, e.g. /master/123-Artist-Album
    cover_image?: string;
    community?: { have?: number };
}

export interface DiscogsSearchPage {
    pagination: { page: number; pages: number; items: number };
    results: DiscogsMaster[];
}

// Optional — without it requests are anonymous (lower rate limit).
function getDiscogsToken(): string | undefined {
    return process.env.DISCOGS_TOKEN || undefined;
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
        // Discogs requires a User-Agent identifying the app.
        'User-Agent': getUserAgent(),
        Accept: 'application/json',
    };
    const token = getDiscogsToken();
    if (token) headers.Authorization = `Discogs token=${token}`;

    // The timeout starts when the limiter releases the request, not while queued.
    const request = () =>
        rateLimited(() =>
            fetch(url, {
                headers,
                cache: 'no-store',
                signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
            }),
        );
    let res = await request();
    if (res.status === 429) {
        await sleep(RETRY_DELAY_MS);
        res = await request();
    }
    if (!res.ok) throw new Error(`Discogs HTTP ${res.status}`);
    return (await res.json()) as T;
}

function slimPage(page: DiscogsSearchPage): DiscogsSearchPage {
    return {
        pagination: page.pagination,
        results: page.results.map((m) => ({
            id: m.id,
            title: m.title,
            year: m.year,
            uri: m.uri,
            cover_image: m.cover_image,
            community: { have: m.community?.have },
        })),
    };
}

function searchParams(filters: Record<string, string>): Record<string, string> {
    return {
        ...filters,
        type: 'master',
        format: 'Album',
        sort: 'have',
        sort_order: 'desc',
        per_page: String(PER_PAGE),
    };
}

// Anonymous pages have no covers; keep them apart so adding a token takes effect.
function cacheKey(kind: string, params: Record<string, string>): string {
    return `discogs:${kind}:${getDiscogsToken() ? 'auth' : 'anon'}:${new URLSearchParams(params)}`;
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
    const params = { ...searchParams(filters), page: String(page) };
    return persistentCached(
        cacheKey('search', params),
        async () => slimPage(await discogsGet<DiscogsSearchPage>('/database/search', params)),
        PAGE_TTL_MS,
    );
}

/**
 * How many result pages `filters` has (0 = no matches). Cached on its own, so a
 * roll with a known count fetches just the page it draws instead of page 1 first.
 */
export function getPageCount(filters: Record<string, string>): Promise<number> {
    return persistentCached(
        cacheKey('pages', searchParams(filters)),
        async () => (await searchMasters(filters, 1)).pagination.pages,
        PAGE_TTL_MS,
    );
}
