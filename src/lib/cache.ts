// Simple in-process cache with TTL. Key is usually `${username}:${kind}`.
// Sufficient for a single instance; with multiple instances each has its own.
//
// The promise is stored rather than the value, so concurrent callers of the same
// key share one in-flight load. Failed loads are dropped (not cached). Expired
// entries are swept periodically and the store is capped, evicting the oldest
// entries first, so memory stays bounded as users and artists accumulate.

interface Entry<T> {
    value: Promise<T>;
    expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();

const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1h
const MAX_ENTRIES = 5000;
const SWEEP_EVERY = 200; // writes

let writes = 0;

function sweep(now: number): void {
    for (const [key, entry] of store) {
        if (entry.expiresAt <= now) store.delete(key);
    }
    // Map iterates in insertion order, so the first keys are the oldest.
    for (const key of store.keys()) {
        if (store.size <= MAX_ENTRIES) break;
        store.delete(key);
    }
}

/**
 * Returns the cached value, or calls `loader`, stores the result and returns it.
 */
export function cached<T>(
    key: string,
    loader: () => Promise<T>,
    ttlMs = DEFAULT_TTL_MS,
): Promise<T> {
    const now = Date.now();
    const hit = store.get(key);
    if (hit && hit.expiresAt > now) {
        return hit.value as Promise<T>;
    }

    const value = loader();
    // Re-insert so the key moves to the end of the eviction order.
    store.delete(key);
    store.set(key, { value, expiresAt: now + ttlMs });
    value.catch(() => {
        if (store.get(key)?.value === value) store.delete(key);
    });

    writes += 1;
    if (writes % SWEEP_EVERY === 0 || store.size > MAX_ENTRIES) sweep(now);
    return value;
}
