import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import {
    getUserData,
    pushHistory,
    setLastAlbum,
    toggleSaved,
    removeSaved,
    mergeInto,
} from '@/lib/userData';
import type { AlbumRecommendation } from '@/lib/lastfm/types';

export async function GET() {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    try {
        const data = await getUserData(user.userId);
        return NextResponse.json(data);
    } catch (err) {
        console.error('user-data GET failed', err);
        return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
}

// One POST endpoint with an `action` discriminator handles every mutation, in the
// same spirit as the recommend route dispatching on `dimension`. `merge` takes
// a whole `data` payload (the guest's localStorage lists) instead of an album.
type Body =
    | { action: 'push' | 'set-last' | 'toggle-saved' | 'remove-saved'; album: AlbumRecommendation }
    | { action: 'merge'; data: unknown };

export async function POST(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    let body: Body;
    try {
        body = (await req.json()) as Body;
    } catch {
        return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    }

    if (body?.action === 'merge') {
        try {
            return NextResponse.json(await mergeInto(user.userId, body.data));
        } catch (err) {
            console.error('user-data merge failed', err);
            return NextResponse.json({ error: 'server_error' }, { status: 500 });
        }
    }

    const { action, album } = body ?? {};
    if (!album || !album.name || !album.artist) {
        return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    }

    try {
        switch (action) {
            case 'push': {
                const history = await pushHistory(user.userId, album);
                return NextResponse.json({ history });
            }
            case 'set-last': {
                await setLastAlbum(user.userId, album);
                return new NextResponse(null, { status: 204 });
            }
            case 'toggle-saved': {
                const result = await toggleSaved(user.userId, album);
                return NextResponse.json(result);
            }
            case 'remove-saved': {
                const saved = await removeSaved(user.userId, album);
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
