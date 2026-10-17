import { NextRequest, NextResponse } from 'next/server';
import { createEmailAccount } from '@/lib/accounts';
import { getSessionFromCookies, saveLogin } from '@/lib/session';
import { clientIp, createAttemptLimiter } from '@/lib/throttle';

// Every attempt counts (not just failures): caps account creation per IP.
const limiter = createAttemptLimiter({ max: 10, windowMs: 60 * 60 * 1000 });

/** Create an email + password account and log it in. */
export async function POST(req: NextRequest) {
    const ip = clientIp(req);
    if (limiter.isLocked(ip)) {
        return NextResponse.json({ error: 'too_many_attempts' }, { status: 429 });
    }
    limiter.recordFailure(ip);

    const body = (await req.json().catch(() => ({}))) as { email?: unknown; password?: unknown };
    if (typeof body.email !== 'string' || typeof body.password !== 'string') {
        return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    }

    try {
        const result = await createEmailAccount(body.email, body.password);
        if ('error' in result) {
            const status = result.error === 'email_taken' ? 409 : 400;
            return NextResponse.json({ error: result.error }, { status });
        }
        await saveLogin(await getSessionFromCookies(), result);
        return NextResponse.json({ ok: true }, { status: 201 });
    } catch (err) {
        console.error('register failed', err);
        return NextResponse.json({ error: 'server_error' }, { status: 500 });
    }
}
