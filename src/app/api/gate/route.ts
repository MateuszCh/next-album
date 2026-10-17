import { NextRequest, NextResponse } from 'next/server';
import { GATE_COOKIE, deriveToken, gateToken, isGateEnabled, tokensEqual } from '@/lib/gate';
import { clientIp, createAttemptLimiter } from '@/lib/throttle';

// After 5 wrong attempts within 15 minutes the IP is locked out until the
// window expires; a correct password resets it.
const limiter = createAttemptLimiter({ max: 5, windowMs: 15 * 60 * 1000 });

export async function POST(req: NextRequest) {
    if (!isGateEnabled()) {
        return NextResponse.json({ ok: true });
    }

    const ip = clientIp(req);
    if (limiter.isLocked(ip)) {
        return NextResponse.json({ error: 'too_many_attempts' }, { status: 429 });
    }

    const body = (await req.json().catch(() => ({}))) as { password?: string };
    // Constant-time comparison: derive a token from the submitted password and
    // compare it to the expected token (never compares the raw password directly).
    const submitted = await deriveToken(body.password ?? '');
    const expected = await gateToken();
    if (!tokensEqual(submitted, expected)) {
        limiter.recordFailure(ip);
        return NextResponse.json({ error: 'wrong_password' }, { status: 401 });
    }

    limiter.reset(ip);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(GATE_COOKIE, expected, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return res;
}

/**
 * Re-lock the app: clear the gate cookie so the access password is required
 * again. The Last.fm session is left untouched.
 */
export async function DELETE() {
    const res = NextResponse.json({ ok: true });
    res.cookies.delete(GATE_COOKIE);
    return res;
}
