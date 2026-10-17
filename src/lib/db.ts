// MongoDB connection. A single MongoClient is reused across requests (and across
// HMR reloads in dev) via a global cache, so we don't open a new pool per call.
// Route handlers run in the Node runtime, so the native driver works there; the
// Edge middleware never touches the DB.

import { MongoClient, type Collection, type Db } from 'mongodb';
import type { AlbumRecommendation } from '@/lib/lastfm/types';

/**
 * One document per account. `_id` is the lowercased Last.fm username for a
 * Last.fm-only account, or `email:<address>` for an email account (Last.fm
 * usernames can't contain `:`, so the two never collide). Credentials and the
 * linked Last.fm username exist only on email accounts.
 */
export interface UserDoc {
    _id: string;
    lastAlbum: AlbumRecommendation | null;
    history: AlbumRecommendation[];
    saved: AlbumRecommendation[];
    updatedAt: Date;
    email?: string;
    passwordHash?: string;
    // Last.fm account linked to an email account (original casing).
    lastfmUsername?: string;
    lastfmKey?: string; // lowercased lastfmUsername — unique across accounts
    createdAt?: Date;
}

// Read env lazily (like getApiKey / getSessionPassword) so a missing var throws a
// clear error at call time, not at module load.
function getMongoUri(): string {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error('MONGODB_URI is not set (add it to .env.local).');
    }
    return uri;
}

function getDbName(): string {
    const name = process.env.MONGODB_DB;
    if (!name) {
        throw new Error('MONGODB_DB is not set (add it to .env.local).');
    }
    return name;
}

// Cache the connection promise on globalThis so dev HMR reuses one client.
const globalForMongo = globalThis as unknown as {
    _mongoClientPromise?: Promise<MongoClient>;
};

function clientPromise(): Promise<MongoClient> {
    if (!globalForMongo._mongoClientPromise) {
        globalForMongo._mongoClientPromise = new MongoClient(getMongoUri()).connect();
    }
    return globalForMongo._mongoClientPromise;
}

async function getDb(): Promise<Db> {
    const client = await clientPromise();
    return client.db(getDbName());
}

// One Last.fm account can be linked to at most one email account. Created once
// per process; a failure is retried on the next call.
let indexesPromise: Promise<unknown> | null = null;

function ensureIndexes(users: Collection<UserDoc>): Promise<unknown> {
    if (!indexesPromise) {
        indexesPromise = users
            .createIndex(
                { lastfmKey: 1 },
                { unique: true, partialFilterExpression: { lastfmKey: { $type: 'string' } } },
            )
            .catch((err) => {
                indexesPromise = null;
                throw err;
            });
    }
    return indexesPromise;
}

export async function getUsersCollection(): Promise<Collection<UserDoc>> {
    const db = await getDb();
    const users = db.collection<UserDoc>('users');
    await ensureIndexes(users);
    return users;
}

/**
 * A persistent cache entry (see `persistentCache.ts`): shared upstream data that
 * should survive a process restart. Mongo's TTL monitor deletes it once
 * `expiresAt` passes (within ~a minute, so readers still check it).
 */
export interface CacheDoc {
    _id: string;
    value: unknown;
    expiresAt: Date;
}

let cacheIndexPromise: Promise<unknown> | null = null;

function ensureCacheIndex(cache: Collection<CacheDoc>): Promise<unknown> {
    if (!cacheIndexPromise) {
        cacheIndexPromise = cache
            .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
            .catch((err) => {
                cacheIndexPromise = null;
                throw err;
            });
    }
    return cacheIndexPromise;
}

export async function getCacheCollection(): Promise<Collection<CacheDoc>> {
    const db = await getDb();
    const cache = db.collection<CacheDoc>('cache');
    await ensureCacheIndex(cache);
    return cache;
}
