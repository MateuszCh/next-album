import { NextResponse } from 'next/server';
import { currentUserOf, getSessionFromCookies, saveLogin } from '@/lib/session';
import { getUserInfo } from '@/lib/lastfm/user';
import { isGateEnabled } from '@/lib/gate';
import { getAccount, isEmailAccount } from '@/lib/accounts';

export async function GET() {
    const session = await getSessionFromCookies();
    let user = currentUserOf(session);
    if (!user) {
        return NextResponse.json({ loggedIn: false, gateEnabled: isGateEnabled() });
    }

    // An email account's Last.fm link can change elsewhere (linked on another
    // device): refresh it from the DB. A missing/unreachable DB keeps the session.
    if (isEmailAccount(user.userId)) {
        try {
            const account = await getAccount(user.userId);
            if (account && account.lastfmUsername !== user.lastfmUsername) {
                user = { ...user, lastfmUsername: account.lastfmUsername };
                await saveLogin(session, user);
            }
        } catch {
            // keep the session's view
        }
    }

    let imageUrl: string | null = null;
    if (user.lastfmUsername) {
        try {
            const info = await getUserInfo(user.lastfmUsername);
            imageUrl = info.imageUrl;
        } catch {
            // a missing avatar is not a critical error
        }
    }

    return NextResponse.json({
        loggedIn: true,
        lastfmUsername: user.lastfmUsername ?? null,
        email: user.email ?? null,
        imageUrl,
        gateEnabled: isGateEnabled(),
    });
}
