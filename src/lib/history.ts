// Client-side history & bookmarks, backed by localStorage. `AlbumRecommendation`
// is JSON-serializable (the existing `lastAlbum` cache already relies on this),
// so we store whole recommendations and can re-show them without a refetch.

import type { AlbumRecommendation } from '@/lib/lastfm/types';

const HISTORY_KEY = 'history';
const SAVED_KEY = 'saved';
const HISTORY_CAP = 50;

/** Identity key for dedup — mirrors `albumKey` in the recommendation engine. */
function albumKey(album: AlbumRecommendation): string {
    return `${album.artist}::${album.name}`.toLowerCase();
}

function read(key: string): AlbumRecommendation[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as AlbumRecommendation[]) : [];
    } catch {
        return [];
    }
}

function write(key: string, list: AlbumRecommendation[]): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(key, JSON.stringify(list));
    } catch {
        // storage full / unavailable — ignore, history is best-effort
    }
}

export function getHistory(): AlbumRecommendation[] {
    return read(HISTORY_KEY);
}

/** Prepend an album to history (newest first), de-duplicated and capped. */
export function pushHistory(album: AlbumRecommendation): void {
    const key = albumKey(album);
    const next = [album, ...read(HISTORY_KEY).filter((a) => albumKey(a) !== key)].slice(
        0,
        HISTORY_CAP,
    );
    write(HISTORY_KEY, next);
}

export function getSaved(): AlbumRecommendation[] {
    return read(SAVED_KEY);
}

export function isSaved(album: AlbumRecommendation): boolean {
    const key = albumKey(album);
    return read(SAVED_KEY).some((a) => albumKey(a) === key);
}

/** Toggle an album in the saved list; returns the new saved state. */
export function toggleSaved(album: AlbumRecommendation): boolean {
    const key = albumKey(album);
    const current = read(SAVED_KEY);
    if (current.some((a) => albumKey(a) === key)) {
        write(
            SAVED_KEY,
            current.filter((a) => albumKey(a) !== key),
        );
        return false;
    }
    write(SAVED_KEY, [album, ...current]);
    return true;
}
