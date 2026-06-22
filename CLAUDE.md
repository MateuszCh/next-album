# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev     # start dev server at http://localhost:3000
npm run build   # production build
npm run start   # serve the production build
npm run lint    # next lint (ESLint)
```

There is no test runner configured.

Requires `.env.local` (copy from `.env.example`): `LASTFM_API_KEY`,
`LASTFM_SHARED_SECRET`, `APP_URL`, `SESSION_SECRET` (≥32 chars). Optional access
control: `ACCESS_PASSWORD`, `ALLOWED_LASTFM_USERS`. The Last.fm app's **Callback
URL** must be set to `<APP_URL>/api/auth/callback`.

## Architecture

Next.js 15 (App Router) + React 19 + TypeScript. The app picks one album to
listen to from a user's Last.fm profile. **All Last.fm communication, request
signing, and the session key are server-only** — the `shared_secret` and session
key never reach the browser. Import alias: `@/*` → `src/*`.

### Request flow

`src/app/page.tsx` (client) → `POST /api/recommend` → `recommendAlbum()` in
`src/lib/recommend/engine.ts`. The route reads the username from the encrypted
session cookie; the client never sends identity.

### Recommendation engine (`src/lib/recommend/`)

The core domain logic. `recommendAlbum(username, discovery)` takes a `discovery`
value 0–1 (from the UI slider) and does a coin flip: `Math.random() < discovery`
decides **discovery** vs **rediscovery** mode for that roll. If the chosen mode
yields nothing, it falls back to the other mode.

- **Rediscovery** — weighted-random album from the user's top albums (weighted by
  playcount), skipping albums in their last 25 recent tracks.
- **Discovery** — weighted-random seed from top artists → Last.fm similar
  artists → drop artists the user already listens to → weighted-random top album
  of the picked artist. Retries up to 5 seeds if similar artists are empty/known.

`weightedPick` (`weighted.ts`) is the shared weighted-random primitive. The
user's profile (top albums/artists + recent tracks) is fetched once and cached
1h per username via `loadProfile`, so repeated rolls are instant and cheap.

### Last.fm client (`src/lib/lastfm/`)

`client.ts` is the only place that talks HTTP to `ws.audioscrobbler.com`:

- `lastfmGet` — unsigned public reads (api_key only).
- `lastfmSignedGet` — signed POST (e.g. `auth.getSession`). `signParams` builds
  the `api_sig` md5 per spec (params sorted, `format`/`callback` excluded).
- Every request goes through `rateLimited` (`limiter.ts`), a global FIFO queue
  enforcing ~250ms spacing (single server IP shares Last.fm's ~5 req/s limit),
  plus retry-with-backoff on rate-limit (error 29 / HTTP 429).

`user.ts` / `artist.ts` / `album.ts` are typed wrappers over specific Last.fm
methods; `types.ts` holds the response shapes. `pickImage` selects the largest
image from Last.fm's image array.

### Cover art (`src/lib/coverart.ts`)

Last.fm frequently returns a placeholder "star" image (detected by known md5
hashes). `resolveCover` upgrades real Last.fm CDN images to 600×600 and falls
back to the Cover Art Archive by mbid when Last.fm only has a placeholder.
Returns `null` when nothing is found (UI shows its own placeholder). Allowed
remote image hosts are whitelisted in `next.config.ts`.

### Auth & access control

Two independent, both-optional layers plus the Last.fm OAuth session:

1. **Password gate** (`src/middleware.ts` + `src/lib/gate.ts`) — runs on the
   Edge for every non-static path. When `ACCESS_PASSWORD` is set, requests
   without a valid gate cookie redirect to `/gate` (or 401 for `/api/*`). The
   gate cookie stores an HMAC token (`gateToken`), not the password; changing
   the password invalidates all cookies. Uses Web Crypto so it runs in both Edge
   and Node runtimes.
2. **Last.fm OAuth session** (`src/lib/session.ts`, iron-session) — login at
   `/api/auth/login` redirects to Last.fm; `/api/auth/callback` exchanges the
   token for `{username, sessionKey}` and saves them in an encrypted, httpOnly
   cookie (`next_album_session`, 30-day).
3. **Username allowlist** (`src/lib/access.ts`) — checked in the callback. If
   `ALLOWED_LASTFM_USERS` is set and the account isn't on it, the session is not
   saved and the user is redirected with `?error=not_allowed`.

`GET /api/me` returns the current session user; `POST /api/auth/logout` clears it.

## Conventions

- Server-only secrets are read lazily from `process.env` inside getter functions
  (e.g. `getApiKey`, `getSessionPassword`) that throw a clear error when missing
  — not at module load. Follow this pattern for new env-dependent code.
- The in-process cache (`cache.ts`) is per-instance; it is not shared across
  multiple server instances. Fine for single-instance deploys.
