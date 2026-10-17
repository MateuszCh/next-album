// Password hashing for email accounts with Node's built-in scrypt (no extra
// dependency). Stored as `scrypt$N$r$p$<salt b64>$<hash b64>` so the cost
// parameters can be raised later without breaking existing hashes. Node runtime
// only — never import this from the Edge middleware.

import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from 'node:crypto';

const N = 16384;
const R = 8;
const P = 1;
const SALT_BYTES = 16;
const KEY_BYTES = 64;

function scrypt(
    password: string,
    salt: Buffer,
    keylen: number,
    opts: ScryptOptions,
): Promise<Buffer> {
    return new Promise((resolve, reject) =>
        scryptCb(password, salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key))),
    );
}

export async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(SALT_BYTES);
    const key = await scrypt(password, salt, KEY_BYTES, { N, r: R, p: P });
    return ['scrypt', N, R, P, salt.toString('base64'), key.toString('base64')].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
    const [scheme, n, r, p, saltB64, keyB64] = stored.split('$');
    if (scheme !== 'scrypt' || !saltB64 || !keyB64) return false;
    const expected = Buffer.from(keyB64, 'base64');
    const key = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length, {
        N: Number(n),
        r: Number(r),
        p: Number(p),
    });
    return key.length === expected.length && timingSafeEqual(key, expected);
}
