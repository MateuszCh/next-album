// Server-side access to a user's stored data (last album, roll history, saved
// albums), persisted per user in MongoDB and keyed by the Last.fm username from
// the session. Dedup + cap logic mirrors what used to live client-side in
// history.ts. Read-modify-write is fine here: traffic is a single user acting on
// their own document, at low volume.

import { getUsersCollection, type UserDoc } from '@/lib/db';
import type { AlbumRecommendation } from '@/lib/lastfm/types';

const HISTORY_CAP = 50;

export interface UserData {
    lastAlbum: AlbumRecommendation | null;
    history: AlbumRecommendation[];
    saved: AlbumRecommendation[];
}

const EMPTY: UserData = { lastAlbum: null, history: [], saved: [] };

/** Identity key for dedup — mirrors `albumKey` in the recommendation engine. */
function albumKey(album: AlbumRecommendation): string {
    return `${album.artist}::${album.name}`.toLowerCase();
}

function userId(username: string): string {
    return username.toLowerCase();
}

async function loadDoc(username: string): Promise<UserDoc | null> {
    const users = await getUsersCollection();
    return users.findOne({ _id: userId(username) });
}

function project(doc: UserDoc | null): UserData {
    if (!doc) return { ...EMPTY };
    return {
        lastAlbum: doc.lastAlbum ?? null,
        history: doc.history ?? [],
        saved: doc.saved ?? [],
    };
}

/** Persist the given fields, upserting the user document. */
async function save(username: string, fields: Partial<UserDoc>): Promise<void> {
    const users = await getUsersCollection();
    await users.updateOne(
        { _id: userId(username) },
        { $set: { ...fields, updatedAt: new Date() } },
        { upsert: true },
    );
}

export async function getUserData(username: string): Promise<UserData> {
    return project(await loadDoc(username));
}

/**
 * Prepend an album to history (newest first, de-duplicated, capped) and record
 * it as the last shown album. Returns the updated history.
 */
export async function pushHistory(
    username: string,
    album: AlbumRecommendation,
): Promise<AlbumRecommendation[]> {
    const doc = await loadDoc(username);
    const key = albumKey(album);
    const history = [album, ...(doc?.history ?? []).filter((a) => albumKey(a) !== key)].slice(
        0,
        HISTORY_CAP,
    );
    await save(username, { lastAlbum: album, history });
    return history;
}

export async function setLastAlbum(username: string, album: AlbumRecommendation): Promise<void> {
    await save(username, { lastAlbum: album });
}

/** Toggle an album in the saved list; returns the new saved list and state. */
export async function toggleSaved(
    username: string,
    album: AlbumRecommendation,
): Promise<{ isSaved: boolean; saved: AlbumRecommendation[] }> {
    const doc = await loadDoc(username);
    const key = albumKey(album);
    const current = doc?.saved ?? [];
    if (current.some((a) => albumKey(a) === key)) {
        const saved = current.filter((a) => albumKey(a) !== key);
        await save(username, { saved });
        return { isSaved: false, saved };
    }
    const saved = [album, ...current];
    await save(username, { saved });
    return { isSaved: true, saved };
}

/** Remove a specific album from the saved list; returns the updated list. */
export async function removeSaved(
    username: string,
    album: AlbumRecommendation,
): Promise<AlbumRecommendation[]> {
    const doc = await loadDoc(username);
    const key = albumKey(album);
    const saved = (doc?.saved ?? []).filter((a) => albumKey(a) !== key);
    await save(username, { saved });
    return saved;
}
