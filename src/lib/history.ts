// Client-side access to the user's stored data (last album, roll history, saved
// albums). These are now persisted per user in MongoDB via `/api/user-data`, so
// they follow the account across browsers and devices. Thin async wrappers over
// fetch; the server owns dedup/cap and identity. Everything is best-effort — a
// failed write is logged and swallowed so the UI keeps working.

import { recommendationKey } from '@/lib/identity';
import type { AlbumRecommendation } from '@/lib/lastfm/types';

export interface UserData {
    lastAlbum: AlbumRecommendation | null;
    history: AlbumRecommendation[];
    saved: AlbumRecommendation[];
}

const EMPTY: UserData = { lastAlbum: null, history: [], saved: [] };

/** Identity key — the same normalized key the server dedups with. */
export function albumKey(album: AlbumRecommendation): string {
    return recommendationKey(album);
}

export function isSaved(saved: AlbumRecommendation[], album: AlbumRecommendation): boolean {
    const key = albumKey(album);
    return saved.some((a) => albumKey(a) === key);
}

/** Load the logged-in user's stored data. Returns empty data if unauthenticated. */
export async function fetchUserData(): Promise<UserData> {
    try {
        const res = await fetch('/api/user-data');
        if (!res.ok) return { ...EMPTY };
        return (await res.json()) as UserData;
    } catch {
        return { ...EMPTY };
    }
}

async function post<T>(body: unknown): Promise<T | null> {
    try {
        const res = await fetch('/api/user-data', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok) return null;
        if (res.status === 204) return null;
        return (await res.json()) as T;
    } catch {
        return null;
    }
}

/** Record a rolled album (prepends to history, sets it as last). Returns history. */
export async function pushHistory(
    album: AlbumRecommendation,
): Promise<AlbumRecommendation[] | null> {
    const res = await post<{ history: AlbumRecommendation[] }>({ action: 'push', album });
    return res?.history ?? null;
}

export async function setLastAlbum(album: AlbumRecommendation): Promise<void> {
    await post({ action: 'set-last', album });
}

export async function toggleSaved(
    album: AlbumRecommendation,
): Promise<{ isSaved: boolean; saved: AlbumRecommendation[] } | null> {
    return post<{ isSaved: boolean; saved: AlbumRecommendation[] }>({
        action: 'toggle-saved',
        album,
    });
}

export async function removeSaved(
    album: AlbumRecommendation,
): Promise<AlbumRecommendation[] | null> {
    const res = await post<{ saved: AlbumRecommendation[] }>({ action: 'remove-saved', album });
    return res?.saved ?? null;
}
