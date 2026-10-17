// Accounts: email + password accounts and their link to a Last.fm account.
//
// Identity (`userId`, the MongoDB `_id` of the user document):
// - Last.fm-only account: the lowercased Last.fm username (unchanged from before
//   email accounts existed, so old data needs no migration);
// - email account: `email:<normalized address>`. Linking Last.fm stores the
//   username on it (`lastfmUsername` + unique `lastfmKey`), and a later direct
//   Last.fm login of that username resolves to the email account.

import { MongoServerError } from 'mongodb';
import { getUsersCollection } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/password';
import { deleteUser, getUserData, mergeInto } from '@/lib/userData';

const EMAIL_PREFIX = 'email:';
export const PASSWORD_MIN = 8;
const PASSWORD_MAX = 200;

// Hash of a random string, verified against when an email doesn't exist so a
// login attempt takes the same time either way (no account enumeration).
let dummyHash: Promise<string> | null = null;

export interface Account {
    userId: string;
    email?: string;
    lastfmUsername?: string;
}

export type AccountError = 'invalid_email' | 'weak_password' | 'email_taken' | 'lastfm_taken';

export function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
    return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isEmailAccount(userId: string): boolean {
    return userId.startsWith(EMAIL_PREFIX);
}

function emailUserId(email: string): string {
    return EMAIL_PREFIX + email;
}

function lastfmUserId(username: string): string {
    return username.trim().toLowerCase();
}

function isDuplicateKey(err: unknown): boolean {
    return err instanceof MongoServerError && err.code === 11000;
}

/** Create an email account. Invalid input comes back as an error code. */
export async function createEmailAccount(
    rawEmail: string,
    password: string,
): Promise<Account | { error: AccountError }> {
    const email = normalizeEmail(rawEmail);
    if (!isValidEmail(email)) return { error: 'invalid_email' };
    if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
        return { error: 'weak_password' };
    }

    const users = await getUsersCollection();
    const now = new Date();
    try {
        await users.insertOne({
            _id: emailUserId(email),
            email,
            passwordHash: await hashPassword(password),
            lastAlbum: null,
            history: [],
            saved: [],
            createdAt: now,
            updatedAt: now,
        });
    } catch (err) {
        if (isDuplicateKey(err)) return { error: 'email_taken' };
        throw err;
    }
    return { userId: emailUserId(email), email };
}

/** Check email + password; returns the account or null on wrong credentials. */
export async function verifyEmailLogin(
    rawEmail: string,
    password: string,
): Promise<Account | null> {
    const email = normalizeEmail(rawEmail);
    const users = await getUsersCollection();
    const doc = isValidEmail(email) ? await users.findOne({ _id: emailUserId(email) }) : null;
    if (!doc?.passwordHash) {
        dummyHash ??= hashPassword(crypto.randomUUID());
        await verifyPassword(password, await dummyHash);
        return null;
    }
    if (!(await verifyPassword(password, doc.passwordHash))) return null;
    return { userId: doc._id, email, lastfmUsername: doc.lastfmUsername };
}

/** Load an account's identity fields (fresh from the DB); null if it's gone. */
export async function getAccount(userId: string): Promise<Account | null> {
    const users = await getUsersCollection();
    const doc = await users.findOne(
        { _id: userId },
        { projection: { email: 1, lastfmUsername: 1 } },
    );
    if (!doc) return null;
    return { userId: doc._id, email: doc.email, lastfmUsername: doc.lastfmUsername };
}

/**
 * The account a direct Last.fm login of `username` belongs to: the email
 * account it's linked to, or else its own Last.fm-only account. Without a
 * reachable DB the login still works (as the Last.fm-only account).
 */
export async function resolveLastfmLogin(username: string): Promise<Account> {
    try {
        const users = await getUsersCollection();
        const linked = await users.findOne(
            { lastfmKey: lastfmUserId(username) },
            { projection: { email: 1 } },
        );
        if (linked) return { userId: linked._id, email: linked.email, lastfmUsername: username };
    } catch (err) {
        console.error('resolveLastfmLogin: DB lookup failed', err);
    }
    return { userId: lastfmUserId(username), lastfmUsername: username };
}

/**
 * Link a Last.fm account to an email account. The data of an existing
 * Last.fm-only account of that username is merged in and that account removed.
 */
export async function linkLastfm(
    userId: string,
    username: string,
): Promise<Account | { error: AccountError }> {
    const users = await getUsersCollection();
    const key = lastfmUserId(username);

    const owner = await users.findOne({ lastfmKey: key }, { projection: { _id: 1 } });
    if (owner && owner._id !== userId) return { error: 'lastfm_taken' };

    try {
        await users.updateOne(
            { _id: userId },
            { $set: { lastfmUsername: username, lastfmKey: key, updatedAt: new Date() } },
        );
    } catch (err) {
        if (isDuplicateKey(err)) return { error: 'lastfm_taken' };
        throw err;
    }

    // Fold the old Last.fm-only account (if any) into this one.
    const legacy = await users.findOne({ _id: key }, { projection: { _id: 1 } });
    if (legacy) {
        await mergeInto(userId, await getUserData(key));
        await deleteUser(key);
    }

    const doc = await users.findOne({ _id: userId }, { projection: { email: 1 } });
    return { userId, email: doc?.email, lastfmUsername: username };
}
