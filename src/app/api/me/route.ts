import { NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';
import { getUserInfo } from '@/lib/lastfm/user';
import { isGateEnabled } from '@/lib/gate';

export async function GET() {
    const session = await getSessionFromCookies();
    if (!session.username) {
        return NextResponse.json({ loggedIn: false, gateEnabled: isGateEnabled() });
    }

    let imageUrl: string | null = null;
    try {
        const info = await getUserInfo(session.username);
        imageUrl = info.imageUrl;
    } catch {
        // a missing avatar is not a critical error
    }

    return NextResponse.json({
        loggedIn: true,
        username: session.username,
        imageUrl,
        gateEnabled: isGateEnabled(),
    });
}
