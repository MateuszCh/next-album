// Server-side access to a user's stored data (last album, roll history, saved
// albums), persisted per account in MongoDB and keyed by the session's `userId`
// (a Last.fm username, or `email:<address>` for email accounts — see
// accounts.ts). Dedup + cap logic lives in userDataOps.ts, shared with the
// logged-out localStorage store. Read-modify-write is fine here: traffic is a
// single user acting on their own document, at low volume.

import { getUsersCollection, type UserDoc } from '@/lib/db';
import {
    EMPTY_USER_DATA,
    mergeUserData,
    prependHistory,
    removeFromSaved,
    sanitizeUserData,
    toggleInSaved,
    type UserData,
} from '@/lib/userDataOps';
import type { AlbumRecommendation } from '@/lib/lastfm/types';

export type { UserData };

function docId(userId: string): string {
    return userId.toLowerCase();
}

async function loadDoc(userId: string): Promise<UserDoc | null> {
    const users = await getUsersCollection();
    return users.findOne({ _id: docId(userId) });
}

// Only the data fields — never credentials (`passwordHash`) — leave this module.
function project(doc: UserDoc | null): UserData {
    if (!doc) return { ...EMPTY_USER_DATA };
    return {
        lastAlbum: doc.lastAlbum ?? null,
        history: doc.history ?? [],
        saved: doc.saved ?? [],
    };
}

/** Persist the given fields, upserting the user document. */
async function save(userId: string, fields: Partial<UserDoc>): Promise<void> {
    const users = await getUsersCollection();
    await users.updateOne(
        { _id: docId(userId) },
        { $set: { ...fields, updatedAt: new Date() } },
        { upsert: true },
    );
}

export async function getUserData(userId: string): Promise<UserData> {
    return project(await loadDoc(userId));
}

/**
 * Prepend an album to history (newest first, de-duplicated, capped) and record
 * it as the last shown album. Returns the updated history.
 */
export async function pushHistory(
    userId: string,
    album: AlbumRecommendation,
): Promise<AlbumRecommendation[]> {
    const doc = await loadDoc(userId);
    const history = prependHistory(doc?.history ?? [], album);
    await save(userId, { lastAlbum: album, history });
    return history;
}

export async function setLastAlbum(userId: string, album: AlbumRecommendation): Promise<void> {
    await save(userId, { lastAlbum: album });
}

/** Toggle an album in the saved list; returns the new saved list and state. */
export async function toggleSaved(
    userId: string,
    album: AlbumRecommendation,
): Promise<{ isSaved: boolean; saved: AlbumRecommendation[] }> {
    const doc = await loadDoc(userId);
    const result = toggleInSaved(doc?.saved ?? [], album);
    await save(userId, { saved: result.saved });
    return result;
}

/** Remove a specific album from the saved list; returns the updated list. */
export async function removeSaved(
    userId: string,
    album: AlbumRecommendation,
): Promise<AlbumRecommendation[]> {
    const doc = await loadDoc(userId);
    const saved = removeFromSaved(doc?.saved ?? [], album);
    await save(userId, { saved });
    return saved;
}

/**
 * Merge other data (a guest's localStorage lists, or a Last.fm-only account
 * being linked) into the user's stored data. `incoming` is sanitized here, so
 * raw client input is fine. Returns the merged data.
 */
export async function mergeInto(userId: string, incoming: unknown): Promise<UserData> {
    const merged = mergeUserData(sanitizeUserData(incoming), project(await loadDoc(userId)));
    await save(userId, merged);
    return merged;
}

export async function deleteUser(userId: string): Promise<void> {
    const users = await getUsersCollection();
    await users.deleteOne({ _id: docId(userId) });
}
