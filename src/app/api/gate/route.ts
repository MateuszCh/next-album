import { NextRequest, NextResponse } from 'next/server';
import { GATE_COOKIE, deriveToken, gateToken, isGateEnabled, tokensEqual } from '@/lib/gate';

// In-memory brute-force throttle. Per-instance (like cache.ts) — adequate for a
// single-instance deploy. After MAX_FAILURES wrong attempts within WINDOW_MS the
// IP is locked out until the window expires; a correct password resets it.
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

function clientIp(req: NextRequest): string {
    const fwd = req.headers.get('x-forwarded-for');
    if (fwd) return fwd.split(',')[0]!.trim();
    return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

/** Returns true if the IP is currently locked out. */
function isLocked(ip: string): boolean {
    const entry = attempts.get(ip);
    if (!entry) return false;
    if (Date.now() > entry.resetAt) {
        attempts.delete(ip);
        return false;
    }
    return entry.count >= MAX_FAILURES;
}

function recordFailure(ip: string): void {
    const now = Date.now();
    const entry = attempts.get(ip);
    if (!entry || now > entry.resetAt) {
        attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    } else {
        entry.count += 1;
    }
}

export async function POST(req: NextRequest) {
    if (!isGateEnabled()) {
        return NextResponse.json({ ok: true });
    }

    const ip = clientIp(req);
    if (isLocked(ip)) {
        return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
    }

    const body = (await req.json().catch(() => ({}))) as { password?: string };
    // Constant-time comparison: derive a token from the submitted password and
    // compare it to the expected token (never compares the raw password directly).
    const submitted = await deriveToken(body.password ?? '');
    const expected = await gateToken();
    if (!tokensEqual(submitted, expected)) {
        recordFailure(ip);
        return NextResponse.json({ error: 'Invalid password.' }, { status: 401 });
    }

    attempts.delete(ip);
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
