// Client-side access to the user's stored data (last album, roll history, saved
// albums), behind one `UserDataStore` interface with two backends:
// - `remoteStore`: logged in — persisted per account in MongoDB via
//   `/api/user-data`, so it follows the account across browsers and devices;
// - `guestStore`: logged out — kept in this browser's localStorage (`guestData`).
//   On login `mergeGuestData` folds it into the account and clears it.
// Both share the dedup/cap logic of userDataOps.ts. Everything is best-effort — a
// failed write is swallowed so the UI keeps working.

import { recommendationKey } from '@/lib/identity';
import {
    EMPTY_USER_DATA,
    isEmptyUserData,
    prependHistory,
    removeFromSaved,
    sanitizeUserData,
    toggleInSaved,
    type UserData,
} from '@/lib/userDataOps';
import type { AlbumRecommendation } from '@/lib/lastfm/types';

export type { UserData };

/** Identity key — the same normalized key the server dedups with. */
export function albumKey(album: AlbumRecommendation): string {
    return recommendationKey(album);
}

export function isSaved(saved: AlbumRecommendation[], album: AlbumRecommendation): boolean {
    const key = albumKey(album);
    return saved.some((a) => albumKey(a) === key);
}

export interface UserDataStore {
    fetch(): Promise<UserData>;
    /** Record a rolled album (prepends to history, sets it as last). Returns history. */
    push(album: AlbumRecommendation): Promise<AlbumRecommendation[] | null>;
    setLast(album: AlbumRecommendation): Promise<void>;
    toggleSaved(
        album: AlbumRecommendation,
    ): Promise<{ isSaved: boolean; saved: AlbumRecommendation[] } | null>;
    removeSaved(album: AlbumRecommendation): Promise<AlbumRecommendation[] | null>;
}

// --- Logged in: MongoDB via /api/user-data ---

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

export const remoteStore: UserDataStore = {
    /** Returns empty data if unauthenticated or the DB is unavailable. */
    async fetch() {
        try {
            const res = await fetch('/api/user-data');
            if (!res.ok) return { ...EMPTY_USER_DATA };
            return (await res.json()) as UserData;
        } catch {
            return { ...EMPTY_USER_DATA };
        }
    },
    async push(album) {
        const res = await post<{ history: AlbumRecommendation[] }>({ action: 'push', album });
        return res?.history ?? null;
    },
    async setLast(album) {
        await post({ action: 'set-last', album });
    },
    toggleSaved(album) {
        return post<{ isSaved: boolean; saved: AlbumRecommendation[] }>({
            action: 'toggle-saved',
            album,
        });
    },
    async removeSaved(album) {
        const res = await post<{ saved: AlbumRecommendation[] }>({ action: 'remove-saved', album });
        return res?.saved ?? null;
    },
};

// --- Logged out: localStorage ---

const GUEST_KEY = 'guestData';

function readGuest(): UserData {
    try {
        const raw = window.localStorage.getItem(GUEST_KEY);
        return raw ? sanitizeUserData(JSON.parse(raw)) : { ...EMPTY_USER_DATA };
    } catch {
        return { ...EMPTY_USER_DATA };
    }
}

function writeGuest(data: UserData): void {
    try {
        window.localStorage.setItem(GUEST_KEY, JSON.stringify(data));
    } catch {
        // storage full or blocked — keep working in memory
    }
}

function updateGuest(change: (data: UserData) => UserData): UserData {
    const next = change(readGuest());
    writeGuest(next);
    return next;
}

export const guestStore: UserDataStore = {
    async fetch() {
        return readGuest();
    },
    async push(album) {
        return updateGuest((d) => ({
            ...d,
            lastAlbum: album,
            history: prependHistory(d.history, album),
        })).history;
    },
    async setLast(album) {
        updateGuest((d) => ({ ...d, lastAlbum: album }));
    },
    async toggleSaved(album) {
        const result = toggleInSaved(readGuest().saved, album);
        updateGuest((d) => ({ ...d, saved: result.saved }));
        return result;
    },
    async removeSaved(album) {
        return updateGuest((d) => ({ ...d, saved: removeFromSaved(d.saved, album) })).saved;
    },
};

/**
 * After login: fold the guest's localStorage data into the account and clear it.
 * Returns the merged account data, or null when there was nothing to merge (or
 * the merge failed — the guest data is then kept for the next attempt).
 */
export async function mergeGuestData(): Promise<UserData | null> {
    const guest = readGuest();
    if (isEmptyUserData(guest)) return null;
    const merged = await post<UserData>({ action: 'merge', data: guest });
    if (!merged) return null;
    try {
        window.localStorage.removeItem(GUEST_KEY);
    } catch {
        // ignore
    }
    return merged;
}
