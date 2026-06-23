// Global limiter for Last.fm requests. All calls go out from a single server
// IP, so they share the limit (~5 req/s/IP per the ToS). We serialize requests
// with a minimum spacing, staying safely under the threshold.

const MIN_INTERVAL_MS = 250; // ~4 requests/s

let lastRequestAt = 0;
let queue: Promise<unknown> = Promise.resolve();

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs `fn` while preserving a minimum interval between consecutive requests.
 * Calls are queued (FIFO).
 */
export function rateLimited<T>(fn: () => Promise<T>): Promise<T> {
    const result = queue.then(async () => {
        const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
        if (wait > 0) await sleep(wait);
        lastRequestAt = Date.now();
        return fn();
    });
    // keep the chain alive regardless of any single request failing
    queue = result.then(
        () => undefined,
        () => undefined,
    );
    return result as Promise<T>;
}
