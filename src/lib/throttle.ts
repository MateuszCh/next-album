// In-memory brute-force throttle for password checks (access gate, email login,
// registration). Per-instance (like cache.ts) — adequate for a single-instance
// deploy. After `max` failures within `windowMs` the key is locked out until the
// window expires; a success resets it.

import type { NextRequest } from 'next/server';

export function clientIp(req: NextRequest): string {
    const fwd = req.headers.get('x-forwarded-for');
    if (fwd) return fwd.split(',')[0]!.trim();
    return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

export interface AttemptLimiter {
    /** True if the key is currently locked out. */
    isLocked(key: string): boolean;
    recordFailure(key: string): void;
    reset(key: string): void;
}

export function createAttemptLimiter({
    max,
    windowMs,
}: {
    max: number;
    windowMs: number;
}): AttemptLimiter {
    const attempts = new Map<string, { count: number; resetAt: number }>();

    return {
        isLocked(key) {
            const entry = attempts.get(key);
            if (!entry) return false;
            if (Date.now() > entry.resetAt) {
                attempts.delete(key);
                return false;
            }
            return entry.count >= max;
        },
        recordFailure(key) {
            const now = Date.now();
            const entry = attempts.get(key);
            if (!entry || now > entry.resetAt) {
                attempts.set(key, { count: 1, resetAt: now + windowMs });
            } else {
                entry.count += 1;
            }
        },
        reset(key) {
            attempts.delete(key);
        },
    };
}
