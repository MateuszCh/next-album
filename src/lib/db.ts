// MongoDB connection. A single MongoClient is reused across requests (and across
// HMR reloads in dev) via a global cache, so we don't open a new pool per call.
// Route handlers run in the Node runtime, so the native driver works there; the
// Edge middleware never touches the DB.

import { MongoClient, type Collection, type Db } from 'mongodb';
import type { AlbumRecommendation } from '@/lib/lastfm/types';

/** One document per user; username is the `_id`, so no extra unique index. */
export interface UserDoc {
    _id: string; // username (lowercased)
    lastAlbum: AlbumRecommendation | null;
    history: AlbumRecommendation[];
    saved: AlbumRecommendation[];
    updatedAt: Date;
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

export async function getUsersCollection(): Promise<Collection<UserDoc>> {
    const db = await getDb();
    return db.collection<UserDoc>('users');
}
