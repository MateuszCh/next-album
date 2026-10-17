import { NextRequest, NextResponse } from 'next/server';
import { verifyEmailLogin, normalizeEmail } from '@/lib/accounts';
import { getSessionFromCookies, saveLogin } from '@/lib/session';
import { clientIp, createAttemptLimiter } from '@/lib/throttle';

// Wrong passwords lock out one email from one IP after 5 tries, and an IP
// spraying many emails after 20; a correct login resets the email's counter.
const WINDOW_MS = 15 * 60 * 1000;
const perAccount = createAttemptLimiter({ max: 5, windowMs: WINDOW_MS });
const perIp = createAttemptLimiter({ max: 20, windowMs: WINDOW_MS });

/** Log in with an email account. */
export async function POST(req: NextRequest) {
    const body = (await req.json().catch(() => ({}))) as { email?: unknown; password?: unknown };
    if (typeof body.email !== 'string' || typeof body.password !== 'string') {
        return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    }

    const ip = clientIp(req);
    const accountKey = `${ip}|${normalizeEmail(body.email)}`;
    if (perIp.isLocked(ip) || perAccount.isLocked(accountKey)) {
        return NextResponse.json({ error: 'too_many_attempts' }, { status: 429 });
    }

    try {
        const account = await verifyEmailLogin(body.email, body.password);
        if (!account) {
            perIp.recordFailure(ip);
            perAccount.recordFailure(accountKey);
            return NextResponse.json({ error: 'wrong_credentials' }, { status: 401 });
        }
        perAccount.reset(accountKey);
        await saveLogin(await getSessionFromCookies(), account);
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('email login failed', err);
        return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
}
