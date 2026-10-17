import { lastfmGet } from './client';
import { cached } from '@/lib/cache';
import type { LastfmTopAlbum, LastfmTopArtist, LastfmRecentTrack, LastfmImage } from './types';

export function pickImage(images: LastfmImage[] | undefined): string | null {
    if (!images || images.length === 0) return null;
    const order: LastfmImage['size'][] = ['mega', 'extralarge', 'large', 'medium', 'small'];
    for (const size of order) {
        const found = images.find((i) => i.size === size && i['#text']);
        if (found) return found['#text'];
    }
    const any = images.find((i) => i['#text']);
    return any ? any['#text'] : null;
}

type Period = 'overall' | '7day' | '1month' | '3month' | '6month' | '12month';

// Last.fm's maximum page size for user.getTop* charts.
const MAX_PAGE_SIZE = 1000;

interface ChartPage<T> {
    items: T[];
    totalPages: number;
}

/**
 * Collects a chart page by page up to `limit` items.
 */
async function paginate<T>(
    fetchPage: (page: number, perPage: number) => Promise<ChartPage<T>>,
    limit: number,
): Promise<T[]> {
    const perPage = Math.min(limit, MAX_PAGE_SIZE);
    const result: T[] = [];
    let page = 1;
    while (result.length < limit) {
        const { items, totalPages } = await fetchPage(page, perPage);
        result.push(...items);
        if (page >= totalPages || items.length === 0) break;
        page += 1;
    }
    return result.slice(0, limit);
}

interface TopAlbumsResponse {
    topalbums?: {
        album: LastfmTopAlbum[];
        '@attr'?: { totalPages: string; page: string };
    };
}

/**
 * Fetches the user's top albums, paginating up to the limit.
 */
export async function getTopAlbums(
    username: string,
    { period = 'overall', limit = 500 }: { period?: Period; limit?: number } = {},
): Promise<LastfmTopAlbum[]> {
    return paginate(async (page, perPage) => {
        const data = await lastfmGet<TopAlbumsResponse>('user.getTopAlbums', {
            user: username,
            period,
            limit: perPage,
            page,
        });
        return {
            items: data.topalbums?.album ?? [],
            totalPages: Number(data.topalbums?.['@attr']?.totalPages ?? '1'),
        };
    }, limit);
}

interface TopArtistsResponse {
    topartists?: {
        artist: LastfmTopArtist[];
        '@attr'?: { totalPages: string; page: string };
    };
}

/**
 * Fetches the user's top artists, paginating up to the limit.
 */
export async function getTopArtists(
    username: string,
    { period = 'overall', limit = 200 }: { period?: Period; limit?: number } = {},
): Promise<LastfmTopArtist[]> {
    return paginate(async (page, perPage) => {
        const data = await lastfmGet<TopArtistsResponse>('user.getTopArtists', {
            user: username,
            period,
            limit: perPage,
            page,
        });
        return {
            items: data.topartists?.artist ?? [],
            totalPages: Number(data.topartists?.['@attr']?.totalPages ?? '1'),
        };
    }, limit);
}

interface RecentTracksResponse {
    recenttracks?: { track: LastfmRecentTrack[] };
}

/**
 * Recently played tracks — used to filter out freshly played albums.
 */
export async function getRecentTracks(username: string, limit = 200): Promise<LastfmRecentTrack[]> {
    const data = await lastfmGet<RecentTracksResponse>('user.getRecentTracks', {
        user: username,
        limit,
    });
    return data.recenttracks?.track ?? [];
}

interface UserInfoResponse {
    user?: { name: string; image: LastfmImage[]; url: string };
}

/**
 * Profile info (avatar) for the header. Cached for an hour: `/api/me` runs on
 * every page load, and Last.fm asks apps not to call the API on page load.
 */
export function getUserInfo(
    username: string,
): Promise<{ name: string; imageUrl: string | null; url: string }> {
    return cached(`userInfo:${username.toLowerCase()}`, async () => {
        const data = await lastfmGet<UserInfoResponse>('user.getInfo', {
            user: username,
        });
        return {
            name: data.user?.name ?? username,
            imageUrl: pickImage(data.user?.image),
            url: data.user?.url ?? `https://www.last.fm/user/${username}`,
        };
    });
}
