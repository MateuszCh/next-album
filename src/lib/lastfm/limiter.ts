// Request limiters. All calls go out from a single server IP, so each upstream
// service's per-IP limit is shared by every user. We serialize requests with a
// minimum spacing, staying safely under the threshold.

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a FIFO queue that runs each `fn` while preserving at least
 * `intervalMs` between consecutive requests.
 */
export function createRateLimiter(intervalMs: number) {
    let lastRequestAt = 0;
    let queue: Promise<unknown> = Promise.resolve();

    return function rateLimited<T>(fn: () => Promise<T>): Promise<T> {
        const result = queue.then(async () => {
            const wait = lastRequestAt + intervalMs - Date.now();
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
    };
}

/** Last.fm: ~5 req/s/IP per the ToS, so ~4 requests/s. */
export const rateLimited = createRateLimiter(250);
