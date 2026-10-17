import { getIronSession, type SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
    // Account id (MongoDB `_id`, see accounts.ts).
    userId?: string;
    // Last.fm username (original casing) — present when the account can use the
    // Last.fm mode: a Last.fm login, or an email account with Last.fm linked.
    lastfmUsername?: string;
    email?: string;
    // Legacy cookie (before email accounts): the Last.fm username only.
    username?: string;
}

export interface CurrentUser {
    userId: string;
    lastfmUsername?: string;
    email?: string;
}

function getSessionPassword(): string {
    const secret = process.env.SESSION_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error('SESSION_SECRET must be at least 32 characters (set it in .env.local).');
    }
    return secret;
}

export function sessionOptions(): SessionOptions {
    return {
        password: getSessionPassword(),
        cookieName: 'next_album_session',
        cookieOptions: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 30, // 30 days
        },
    };
}

/**
 * Returns the encrypted session bound to the current request's cookie.
 */
export async function getSessionFromCookies() {
    const cookieStore = await cookies();
    return getIronSession<SessionData>(cookieStore, sessionOptions());
}

/** The logged-in account from a session, mapping legacy (username-only) cookies. */
export function currentUserOf(session: SessionData): CurrentUser | null {
    if (session.userId) {
        return {
            userId: session.userId,
            lastfmUsername: session.lastfmUsername,
            email: session.email,
        };
    }
    if (session.username) {
        return { userId: session.username.toLowerCase(), lastfmUsername: session.username };
    }
    return null;
}

/** The logged-in account of the current request, or null. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
    return currentUserOf(await getSessionFromCookies());
}

/** Store an account in the session (replacing any previous login) and save it. */
export async function saveLogin(
    session: Awaited<ReturnType<typeof getSessionFromCookies>>,
    user: CurrentUser,
): Promise<void> {
    session.userId = user.userId;
    session.lastfmUsername = user.lastfmUsername;
    session.email = user.email;
    delete session.username;
    await session.save();
}
