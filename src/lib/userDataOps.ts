// Pure list operations on a user's stored data (last album, roll history, saved
// albums). Shared by the server (MongoDB, `userData.ts`), the logged-out
// localStorage store (`history.ts`) and account merges, so dedup + cap behave
// identically everywhere. No server-only imports — this runs in the browser too.

import { recommendationKey as albumKey } from '@/lib/identity';
import type { AlbumRecommendation } from '@/lib/lastfm/types';

export const HISTORY_CAP = 50;
// Saved albums are uncapped in normal use; only untrusted merge input is bounded.
const SAVED_MERGE_CAP = 500;

export interface UserData {
    lastAlbum: AlbumRecommendation | null;
    history: AlbumRecommendation[];
    saved: AlbumRecommendation[];
}

export const EMPTY_USER_DATA: UserData = { lastAlbum: null, history: [], saved: [] };

export function isEmptyUserData(data: UserData): boolean {
    return !data.lastAlbum && data.history.length === 0 && data.saved.length === 0;
}

/** Drop later duplicates (by album identity), keeping the first occurrence. */
function dedup(albums: AlbumRecommendation[]): AlbumRecommendation[] {
    const seen = new Set<string>();
    return albums.filter((a) => {
        const key = albumKey(a);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

/** Prepend an album to history (newest first, de-duplicated, capped). */
export function prependHistory(
    history: AlbumRecommendation[],
    album: AlbumRecommendation,
): AlbumRecommendation[] {
    return dedup([album, ...history]).slice(0, HISTORY_CAP);
}

/** Toggle an album in the saved list; returns the new list and state. */
export function toggleInSaved(
    saved: AlbumRecommendation[],
    album: AlbumRecommendation,
): { isSaved: boolean; saved: AlbumRecommendation[] } {
    const key = albumKey(album);
    if (saved.some((a) => albumKey(a) === key)) {
        return { isSaved: false, saved: saved.filter((a) => albumKey(a) !== key) };
    }
    return { isSaved: true, saved: [album, ...saved] };
}

export function removeFromSaved(
    saved: AlbumRecommendation[],
    album: AlbumRecommendation,
): AlbumRecommendation[] {
    const key = albumKey(album);
    return saved.filter((a) => albumKey(a) !== key);
}

/**
 * Merge `incoming` (e.g. a guest's localStorage data, or a Last.fm-only account
 * being linked) into `base`. There are no timestamps, so incoming entries go
 * first — they're the most recent activity of whoever is merging.
 */
export function mergeUserData(incoming: UserData, base: UserData): UserData {
    return {
        lastAlbum: incoming.lastAlbum ?? base.lastAlbum,
        history: dedup([...incoming.history, ...base.history]).slice(0, HISTORY_CAP),
        saved: dedup([...incoming.saved, ...base.saved]),
    };
}

function isAlbum(x: unknown): x is AlbumRecommendation {
    if (!x || typeof x !== 'object') return false;
    const a = x as Record<string, unknown>;
    return (
        typeof a.name === 'string' &&
        a.name !== '' &&
        typeof a.artist === 'string' &&
        a.artist !== ''
    );
}

function albumList(x: unknown, cap: number): AlbumRecommendation[] {
    return Array.isArray(x) ? x.filter(isAlbum).slice(0, cap) : [];
}

/** Validate untrusted user data (client input / localStorage): bad entries are dropped. */
export function sanitizeUserData(raw: unknown): UserData {
    if (!raw || typeof raw !== 'object') return { ...EMPTY_USER_DATA };
    const r = raw as Record<string, unknown>;
    return {
        lastAlbum: isAlbum(r.lastAlbum) ? r.lastAlbum : null,
        history: albumList(r.history, HISTORY_CAP),
        saved: albumList(r.saved, SAVED_MERGE_CAP),
    };
}
