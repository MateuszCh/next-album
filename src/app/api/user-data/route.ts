import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';
import {
    getUserData,
    pushHistory,
    setLastAlbum,
    toggleSaved,
    removeSaved,
} from '@/lib/userData';
import type { AlbumRecommendation } from '@/lib/lastfm/types';

export async function GET() {
    const session = await getSessionFromCookies();
    if (!session.username) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    try {
        const data = await getUserData(session.username);
        return NextResponse.json(data);
    } catch (err) {
        console.error('user-data GET failed', err);
        return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
}

// One POST endpoint with an `action` discriminator handles every mutation, in the
// same spirit as the recommend route dispatching on `dimension`.
interface Body {
    action: 'push' | 'set-last' | 'toggle-saved' | 'remove-saved';
    album: AlbumRecommendation;
}

export async function POST(req: NextRequest) {
    const session = await getSessionFromCookies();
    if (!session.username) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    let body: Body;
    try {
        body = (await req.json()) as Body;
    } catch {
        return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    }

    const { action, album } = body;
    if (!album || !album.name || !album.artist) {
        return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    }

    try {
        switch (action) {
            case 'push': {
                const history = await pushHistory(session.username, album);
                return NextResponse.json({ history });
            }
            case 'set-last': {
                await setLastAlbum(session.username, album);
                return new NextResponse(null, { status: 204 });
            }
            case 'toggle-saved': {
                const result = await toggleSaved(session.username, album);
                return NextResponse.json(result);
            }
            case 'remove-saved': {
                const saved = await removeSaved(session.username, album);
                return NextResponse.json({ saved });
            }
            default:
                return NextResponse.json({ error: 'bad_request' }, { status: 400 });
        }
    } catch (err) {
        console.error('user-data POST failed', err);
        return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
}
