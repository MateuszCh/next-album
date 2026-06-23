import { getIronSession, type SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
    username?: string;
    sessionKey?: string;
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
