// Production entry point. Boots the already-built Next.js app.
//
// Usage:
//   npm install
//   npm run build      # MUST run first — this file serves the build in .next/
//   node app.js        # or point your host's "startup file" at app.js
//
// Honors PORT and HOST. PORT may be a number or a unix socket path (Passenger).
// Runs in production unless NODE_ENV === "development".

const { createServer } = require('http');
const next = require('next');
const { loadEnvConfig } = require('@next/env');

// Load .env / .env.local before anything reads process.env (session secret,
// gate password, Last.fm keys are all read from env at request time).
const dev = process.env.NODE_ENV === 'development';
loadEnvConfig(process.cwd(), dev);

const port = process.env.PORT || 3000;
const hostname = process.env.HOST || '0.0.0.0';
const isNumericPort = /^\d+$/.test(String(port));

const app = next({
    dev,
    hostname,
    // next() wants a numeric port to build absolute URLs; skip it for sockets.
    port: isNumericPort ? Number(port) : undefined,
});
const handle = app.getRequestHandler();

app.prepare().then(() => {
    createServer((req, res) => handle(req, res)).listen(port, () => {
        console.log(`> next-album ready (production: ${!dev}) listening on ${port}`);
    });
});
