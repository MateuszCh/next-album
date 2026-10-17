import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    // Emit a self-contained server bundle (.next/standalone/server.js) so the
    // production Docker image can run without the full node_modules tree.
    output: 'standalone',
    // Limit build-time parallelism so `next build` doesn't hit the per-account
    // process limit on shared hosting (spawn ... EAGAIN).
    experimental: {
        workerThreads: false,
        cpus: 1,
    },
};

export default nextConfig;
