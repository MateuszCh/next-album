import { NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';

export async function POST() {
    // Log out of Last.fm only — destroy our app session (username + Last.fm
    // session key). The gate cookie is left intact, so the access password is
    // NOT required again; locking is a separate action (DELETE /api/gate).
    const session = await getSessionFromCookies();
    session.destroy();

    return NextResponse.json({ ok: true });
}
