# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
docker compose up             # start the full dev stack: app (Node 24) + MongoDB
docker compose up --build     # rebuild the app image after dependency changes
docker compose down           # stop the stack (add -v to also wipe the DB data)

# Production image (connects to an external MongoDB via MONGODB_URI):
docker build --target prod -t next-album .

# Running on the host instead of in Docker (needs a reachable MongoDB):
npm run dev                   # dev server at http://localhost:3000
npm run build                 # production build
npm run start                 # serve the production build
npm run lint                  # next lint (ESLint)
```

There is no test runner configured. `docker-compose.yml` runs the whole dev
environment in Docker (the `Dockerfile` `dev` target for the app plus a `mongo:6`
service). The app talks to the `mongo` service and compose overrides
`MONGODB_URI=mongodb://mongo:27017` for the containerized run. Production does not
use compose — the `Dockerfile` `prod` target builds a standalone image
(`next.config.ts` sets `output: 'standalone'`) that reads `MONGODB_URI` from its
own config.

Requires `.env.local` (copy from `.env.example`): `LASTFM_API_KEY`,
`LASTFM_SHARED_SECRET`, `APP_URL`, `SESSION_SECRET` (≥32 chars), plus
`MONGODB_URI` and `MONGODB_DB` for per-user data storage. Optional access
control: `ACCESS_PASSWORD`, `ALLOWED_LASTFM_USERS`. The Last.fm app's **Callback
URL** must be set to `<APP_URL>/api/auth/callback`.

## Deployment (production)

There are two independent ways to deploy; both read **all config from env**
(nothing is baked into the build), and both need a **reachable MongoDB** —
there is no compose `mongo` service in production, so `MONGODB_URI` must point at
a real database (e.g. MongoDB Atlas, a managed instance, or a Mongo on the host).
`docker-compose.yml` is dev-only.

**Required production env** (in `.env.local` on the host, or real env vars):
`LASTFM_API_KEY`, `LASTFM_SHARED_SECRET`, `APP_URL` (the public URL — the Last.fm
Callback URL must be `<APP_URL>/api/auth/callback`), `SESSION_SECRET` (≥32 chars),
`MONGODB_URI`, `MONGODB_DB`, and optionally `ACCESS_PASSWORD` /
`ALLOWED_LASTFM_USERS`. Without `MONGODB_URI`/`MONGODB_DB` the app still boots but
`/api/user-data` fails and history/saved/last-album stop persisting (the rest
works — graceful degradation).

**A) `app.js` (shared hosting / Passenger)** — the current setup. `app.js` is a
custom Node server that loads `.env.local` via `@next/env`, then boots the
prebuilt Next app from `.next`. `output: 'standalone'` does not affect this path
(it only adds an extra `.next/standalone` artifact; the normal `.next` build is
unchanged). Deploy steps:

```bash
npm install          # pulls the mongodb dependency too
# set MONGODB_URI + MONGODB_DB (and the other vars) in .env.local
npm run build
node app.js          # or point the host's startup file at app.js
```

`app.js` honors `PORT` (number or unix socket) and `HOST`.

**B) Docker image (`prod` target)** — a self-contained standalone image
(`.next/standalone/server.js`) for container platforms:

```bash
docker build --target prod -t next-album .
docker run -p 3000:3000 \
  -e MONGODB_URI='<external-uri>' -e MONGODB_DB=next_album \
  -e LASTFM_API_KEY=... -e LASTFM_SHARED_SECRET=... \
  -e APP_URL='https://your.app' -e SESSION_SECRET=... \
  next-album
```

## Architecture

Next.js 15 (App Router) + React 19 + TypeScript. The app picks one album to
listen to from a user's Last.fm profile. **All Last.fm communication, request
signing, and the session key are server-only** — the `shared_secret` and session
key never reach the browser. Import alias: `@/*` → `src/*`.

### Request flow

`src/app/page.tsx` (client) → `GET /api/recommend?discovery=<0–1>&dimension=<…>&tag=<…>`
→ `recommendAlbum()` by default; `recommendByTag()` when `dimension` is a tag
dimension (`genre`/`mood`/`decade`, with a `tag`); `recommendCurrent()` when
`dimension=current`. All in `src/lib/recommend/engine.ts`. The route reads the
username from the encrypted session cookie; the client never sends identity, only
the slider value and an optional dimension + curated tag (validated server-side
via `isKnownGenre`/`isKnownMood`/`isKnownDecade`). The legacy `genre=<tag>` param
is still accepted and mapped to `dimension=genre`.

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

**Tag-dimension modes** (`recommendByTag`) do the same discovery/rediscovery
coin flip but scoped to a curated Last.fm tag. Three dimensions share this one
pipeline, each a fixed `{tag, label}` list (not Last.fm's noisy top tags):
genre (`genres.ts`), mood (`moods.ts`) and decade (`decades.ts`).
`recommendGenreFavorites` intersects the user's top albums with the tag's top
artists (`tag.getTopArtists`); `recommendGenreDiscovery` picks from the tag's top
albums (`tag.getTopAlbums`) dropping known artists, weighted by list position
since tag albums carry no playcount. Both fall back to the other mode if one is
empty.

**"Right now" mode** (`recommendCurrent`) anchors the same coin flip to this
week's listening (`user.getWeeklyArtistChart`, cached 1h): favorites whose artist
is in the weekly chart, or discovery seeded from those artists (via the shared
`discoverFromSeeds`). Falls back to the standard mix when there's no weekly data.

**History & saved albums** are stored per user in MongoDB (keyed by the session
username), not in the browser. Every roll is pushed to a capped (50) history list
and set as the last album; the star on `AlbumCard` toggles an album into a saved
list. `HistoryPanel` shows both and re-displays a past album without a refetch
(recommendations are JSON-serializable). Server logic lives in
`src/lib/userData.ts` behind the `/api/user-data` route (`GET` returns
`{ lastAlbum, history, saved }`; `POST` dispatches on an `action` discriminator:
`push` / `set-last` / `toggle-saved` / `remove-saved`). The client wrappers in
`src/lib/history.ts` are thin async fetch calls; `src/app/page.tsx` owns the
saved state and passes it to `AlbumCard`. UI-only preferences (`discovery`,
`flowMode`, `genre`/`mood`/`decade`) still live in localStorage.

### Database (`src/lib/db.ts`)

MongoDB via the native driver. A single `MongoClient` is cached on `globalThis`
(reused across requests and dev HMR). `MONGODB_URI`/`MONGODB_DB` are read lazily
(same getter-that-throws pattern as the other secrets). One collection, `users`,
holds one document per user (`_id` = lowercased username) with `lastAlbum`,
`history`, `saved`, `updatedAt`. Only Node-runtime route handlers touch it; the
Edge middleware does not.

### Last.fm client (`src/lib/lastfm/`)

`client.ts` is the only place that talks HTTP to `ws.audioscrobbler.com`:

- `lastfmGet` — unsigned public reads (api_key only).
- `lastfmSignedGet` — signed POST (e.g. `auth.getSession`). `signParams` builds
  the `api_sig` md5 per spec (params sorted, `format`/`callback` excluded).
- Every request goes through `rateLimited` (`limiter.ts`), a global FIFO queue
  enforcing ~250ms spacing (single server IP shares Last.fm's ~5 req/s limit),
  plus retry-with-backoff on rate-limit (error 29 / HTTP 429).

`user.ts` / `artist.ts` / `album.ts` / `tag.ts` are typed wrappers over specific
Last.fm methods; `types.ts` holds the response shapes. `pickImage` selects the
largest image from Last.fm's image array.

### Internationalization (`src/lib/i18n.ts`)

Dependency-free client i18n: a flat `pl`/`en` dictionary plus an interpolating
`translate`. `LanguageProvider` seeds from a `lang` cookie the server reads in
`layout.tsx`, so SSR and first client render match (no EN→PL flash). `setLang`
writes the cookie (1y) for the next server render. Recommendation reasons are
returned from the API as a structured `AlbumReason` union and translated on the
client, so switching language re-renders an already-shown album's reason without
a refetch.

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
