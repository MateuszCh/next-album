// Two-level cache for shared upstream data (Discogs pages, album info, covers):
// the in-process `cached` (L1) in front of a MongoDB `cache` collection (L2), so
// warm data survives a restart or an idle process being spun down. Per-user data
// stays in L1 only.
//
// Mongo is strictly optional here: a missing config, a slow or unreachable
// database all fall through to the loader, so the app behaves as with L1 alone.

import { cached } from '@/lib/cache';
import { getCacheCollection } from '@/lib/db';

// Cap a cache read well below the driver's 30 s server-selection timeout; a slow
// database should cost a roll at most this much before going upstream.
const READ_TIMEOUT_MS = 500;
// After a failed or timed-out read, skip Mongo for a while so a down database
// doesn't add the timeout to every lookup of every roll.
const BACKOFF_MS = 30_000;

let skipUntil = 0;

async function readStored<T>(key: string): Promise<{ value: T } | null> {
    if (Date.now() < skipUntil) return null;
    // Wrapped so a miss (`{ doc: null }`) is told apart from a failure (`null`).
    const read = getCacheCollection()
        .then((cache) => cache.findOne({ _id: key }))
        .then((doc) => ({ doc }));
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), READ_TIMEOUT_MS));
    const result = await Promise.race([read, timeout]).catch(() => null);
    if (!result) {
        skipUntil = Date.now() + BACKOFF_MS;
        return null;
    }
    const { doc } = result;
    return doc && doc.expiresAt.getTime() > Date.now() ? { value: doc.value as T } : null;
}

function writeStored(key: string, value: unknown, ttlMs: number): void {
    const expiresAt = new Date(Date.now() + ttlMs);
    getCacheCollection()
        .then((cache) => cache.replaceOne({ _id: key }, { value, expiresAt }, { upsert: true }))
        .catch(() => {});
}

/**
 * Like `cached`, but a miss is looked up in MongoDB before calling `loader`, and
 * a fresh result is stored there for `ttlMs`. `null` results are stored too
 * (e.g. "no cover"); a throwing loader stores nothing. Values must be
 * BSON-serializable — keep them slim.
 */
export function persistentCached<T>(
    key: string,
    loader: () => Promise<T>,
    ttlMs: number,
): Promise<T> {
    return cached(
        key,
        async () => {
            const stored = await readStored<T>(key);
            if (stored) return stored.value;
            const value = await loader();
            writeStored(key, value, ttlMs);
            return value;
        },
        ttlMs,
    );
}
