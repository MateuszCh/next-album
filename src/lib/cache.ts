// Simple in-process cache with TTL. Key is usually `${username}:${kind}`.
// Sufficient for a single instance; with multiple instances each has its own.

interface Entry<T> {
    value: T;
    expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();

const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1h

/**
 * Returns the cached value, or calls `loader`, stores the result and returns it.
 */
export async function cached<T>(
    key: string,
    loader: () => Promise<T>,
    ttlMs = DEFAULT_TTL_MS,
): Promise<T> {
    const now = Date.now();
    const hit = store.get(key);
    if (hit && hit.expiresAt > now) {
        return hit.value as T;
    }
    const value = await loader();
    store.set(key, { value, expiresAt: now + ttlMs });
    return value;
}

export function invalidate(prefix: string): void {
    for (const key of store.keys()) {
        if (key.startsWith(prefix)) store.delete(key);
    }
}
