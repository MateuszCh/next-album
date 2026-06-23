import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/lastfm/auth';
import { getSessionFromCookies } from '@/lib/session';
import { isUserAllowed } from '@/lib/access';
import { OAUTH_NONCE_COOKIE, safeEqual } from '@/lib/oauth';

export async function GET(req: NextRequest) {
    const base = process.env.APP_URL ?? req.nextUrl.origin;
    const home = base.replace(/\/$/, '');
    const token = req.nextUrl.searchParams.get('token');

    if (!token) {
        return NextResponse.redirect(`${home}/?error=missing_token`);
    }

    // Login-CSRF defense: the nonce from the callback URL must match the one set
    // on the user's browser at /api/auth/login. This stops an attacker from
    // feeding a victim a token tied to the attacker's Last.fm account.
    const nonceParam = req.nextUrl.searchParams.get('nonce');
    const nonceCookie = req.cookies.get(OAUTH_NONCE_COOKIE)?.value;
    if (!nonceParam || !nonceCookie || !safeEqual(nonceParam, nonceCookie)) {
        return NextResponse.redirect(`${home}/?error=auth_failed`);
    }

    try {
        const { username, sessionKey } = await getSession(token);

        // Allowlist: only specific Last.fm accounts are allowed in.
        if (!isUserAllowed(username)) {
            const res = NextResponse.redirect(`${home}/?error=not_allowed`);
            res.cookies.delete(OAUTH_NONCE_COOKIE);
            return res;
        }

        const session = await getSessionFromCookies();
        session.username = username;
        session.sessionKey = sessionKey;
        await session.save();
        const res = NextResponse.redirect(home + '/');
        res.cookies.delete(OAUTH_NONCE_COOKIE);
        return res;
    } catch {
        return NextResponse.redirect(`${home}/?error=auth_failed`);
    }
}
