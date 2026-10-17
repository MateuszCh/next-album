# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
docker compose up             # start the full dev stack: app (Node 24) + MongoDB
docker compose up --build     # rebuild the app image after dependency changes
docker compose down           # stop the stack (add -v to also wipe the DB data)

./dev.sh                      # wrapper: up --build in the foreground (Ctrl-C stops)
./dev.sh up|down|restart|rebuild|logs|ps|sh   # sh = shell in the `web` container

# Production image (connects to an external MongoDB via MONGODB_URI):
docker build --target prod -t next-album .

# Running on the host instead of in Docker (needs a reachable MongoDB):
npm run dev                   # dev server at http://localhost:3000
npm run build                 # production build
npm run start                 # serve the production build (next start)
npm run serve                 # serve the production build via app.js
npm run lint                  # next lint (ESLint is not installed — it will prompt)
```

There is no test runner and no ESLint config; `npx tsc --noEmit` is the quickest
check. `docker-compose.yml` runs the whole dev environment in Docker (the
`Dockerfile` `dev` target as the `web` service, with the source bind-mounted and
`WATCHPACK_POLLING` for hot reload, plus a `mongo:6` service with a named volume).
The app talks to the `mongo` service and compose overrides
`MONGODB_URI=mongodb://mongo:27017` for the containerized run. Production does not
use compose — the `Dockerfile` `prod` target builds a standalone image
(`next.config.ts` sets `output: 'standalone'`) that reads `MONGODB_URI` from its
own config. `next.config.ts` also limits build parallelism (`cpus: 1`,
`workerThreads: false`) so `next build` doesn't hit the shared host's process
limit (`spawn EAGAIN`) — keep it.

Requires `.env.local` (copy from `.env.example`): `LASTFM_API_KEY`,
`LASTFM_SHARED_SECRET`, `APP_URL`, `SESSION_SECRET` (≥32 chars), plus
`MONGODB_URI` and `MONGODB_DB` for per-user data storage. Optional:
`DISCOGS_TOKEN` (album search: covers + higher rate limit), and access control
`ACCESS_PASSWORD`, `ALLOWED_LASTFM_USERS`. The Last.fm app's **Callback
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
`MONGODB_URI`, `MONGODB_DB`, and optionally `DISCOGS_TOKEN`, `ACCESS_PASSWORD` /
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
listen to, in **two modes** (tabs in `src/app/page.tsx`, remembered in
localStorage `appMode`):

- **For me** (`lastfm`) — from the user's Last.fm profile, steered only by the
  favorites ↔ discovery slider. No filters. Needs a Last.fm username: a Last.fm
  login, or an email account with Last.fm linked (otherwise the tab shows a
  login / "Connect Last.fm" hero).
- **Find an album** (`search`) — a random well-loved album from **Discogs** for
  genre / decade / country filters. No slider and **no login needed**.

Logging in is optional (`/login`: Last.fm, or email + password). See "Auth &
access control".

**All Last.fm communication and request signing are server-only** — the
`shared_secret` never reaches the browser, and the Last.fm session key isn't
kept at all (every call the app makes is an unsigned public read).
Import alias: `@/*` → `src/*`.

### Request flow

- **For me:** `GET /api/recommend?discovery=<0–1>` → `recommend()` in
  `src/lib/recommend/engine.ts`. The route reads the Last.fm username from the
  encrypted session cookie (401 `not_logged_in` without one — also for an email
  account without Last.fm linked); the client sends only the slider value.
  Failures return `502 {error:'pick_failed'}`.
- **Find an album:** `GET /api/search?genre=<…>&decade=<…>&country=<…>` →
  `searchAlbum()` in `src/lib/search.ts`. No session needed (the password gate
  still applies). Each dimension is a **multi-select list**: repeated params
  (`?genre=a&genre=b`) or comma-separated (`?genre=a,b`), parsed by `parseTags`
  and validated against the curated lists (`isKnownGenre`/`isKnownDecade`/
  `isKnownCountry`), so the search only sees curated tags. An empty match returns
  `400 {error:'no_matches'}` (localized by the client); other failures
  `502 {error:'pick_failed'}`.

### Recommendation engine — For me (`src/lib/recommend/engine.ts`)

One entry point, `recommend(username, { discovery, recentRolls })`. Every roll is a coin flip:
`Math.random() < discovery` picks **discovery** vs **favorites** (rediscovery)
for that roll; if the chosen mode yields nothing it falls back to the other.
`weightedPick` (`weighted.ts`) is the shared weighted-random primitive. User data
is fetched lazily per mode and cached per username: `loadLibrary` (24h — the
whole artist library with playcounts, paginated 1000/page; its top 200 are the
seeds), `loadProfile` (1h — top 500 albums of all time with duplicate editions
merged, plus the albums played in the last 3 months) and `loadRecentAlbumKeys`
(5 min — last 25 scrobbles). The route passes the stored roll history
(`recentRolls`, read with a 1.5 s cap) so recent picks are never repeated.

- **Favorites/rediscovery** (`recommendFavorites`) — weighted-random album from
  the user's top albums (weighted by summed playcount) that is out of rotation:
  not played in the last 3 months or last 25 scrobbles, not recently rolled.
  When every favorite is in rotation it returns null (→ discovery).
- **Discovery** (`discoverFromSeeds`) — seed from top artists weighted by
  √playcount → Last.fm similar artists → drop known artists (`KNOWN_MIN_PLAYS`
  = 20+ plays; a collaboration counts by its most played part) →
  weighted-random top album of the picked artist, skipping recent rolls. For a
  "sampled" artist (1–19 plays) `pickUnplayedAlbum` checks the user's own
  `userplaycount` (`getUserAlbumPlaycount`, `album.getInfo` with `username`)
  and skips albums already played. Never falls back to known artists; retries
  up to 5 seeds.

Album and artist identity goes through `src/lib/identity.ts` (`albumKey`,
`artistKey`, `artistKeys`): case, diacritics (incl. `ł`), punctuation, a leading
"The" and edition suffixes ("(2011 Remastered Version)", "Deluxe Edition") are
folded, so Last.fm's duplicate entries of one album compare equal. The same key
dedups history/saved on the server and the client.

### Album search — Find an album (`src/lib/search.ts`, `src/lib/discogs.ts`)

Filters are fixed curated lists: `src/lib/recommend/genres.ts`, `decades.ts`,
`countries.ts` (`tag` = stable id sent by the client; `label`; plus the Discogs
mapping). Semantics are **OR within a dimension, AND across dimensions**: each
roll draws one selected value per dimension and combines them into a single
Discogs query (`drawQuery`):

- **genre** → a random variant from `Genre.discogs` (Discogs takes one genre and
  one style per query, e.g. metal → Heavy Metal / Thrash / Death Metal / …);
- **decade** → `year=<from>-<from+9>`;
- **country** → `Country.discogs` (`UK`, `US`, `Poland`, …). Discogs matches a
  country if *any* release of the album was issued there, so e.g. Japan also
  returns Japanese pressings of Western albums.

With no filters at all it draws a random genre. `searchMasters` queries
`/database/search` for `type=master&format=Album` (no singles/EPs/demos), most
collected first (`sort=have`). `searchAlbum` picks a page among the first 10
(50 per page; weight `1/page`, so deep, rarely-owned pages are rare), then an
album weighted by `sqrt(have) + 1`; an empty combination is redrawn up to 3
times before `no_matches`. Discogs titles are `Artist - Album`; the artist is
cleaned of Discogs' disambiguation suffixes (`*`, ` (2)`). The reason is
`{ kind: 'search', filters, have }`.

`discogs.ts` sends a `User-Agent` built from `APP_URL` (required by Discogs) and
the optional `DISCOGS_TOKEN` (`Authorization: Discogs token=…`). Requests go
through their own `createRateLimiter` queue — 2.4 s spacing anonymous (25
req/min), 1 s with a token (60 req/min) — retry a 429 once, and result pages are
cached 1h. **Anonymous requests get no cover images** (Discogs serves images only
to token requests), so `coverFor` falls back to Last.fm `album.getInfo` art (API
key only, no account) and then the Cover Art Archive via `resolveCover`.

### History & saved albums

Every roll (both modes) is pushed to a capped (50) history list and set as the
last album; the star toggles an album into a saved list. `HistoryPanel`
re-displays a past album without a refetch (recommendations are
JSON-serializable; `AlbumRecommendation.mode` is `rediscovery` / `discovery` /
`search`, `source` is `lastfm` / `discogs`).

`src/lib/history.ts` exposes one `UserDataStore` interface with two backends,
picked by `src/app/page.tsx` (which owns the saved state and passes it to
`AlbumCard`):

- **Logged in** — `remoteStore`: per account in MongoDB (keyed by the session
  `userId`) via `/api/user-data`. Server logic in `src/lib/userData.ts` (`GET`
  returns `{ lastAlbum, history, saved }`; `POST` dispatches on an `action`
  discriminator: `push` / `set-last` / `toggle-saved` / `remove-saved` /
  `merge`).
- **Logged out** — `guestStore`: the same data in localStorage (`guestData`).
  After any login the page calls `mergeGuestData()` (`action: 'merge'`), which
  folds it into the account (guest entries first, deduped) and clears it.

The dedup/cap/merge logic is pure and shared by both in `src/lib/userDataOps.ts`
(`sanitizeUserData` validates untrusted merge input and localStorage). UI-only
preferences (`appMode`, `discovery`, and the `genre`/`decade`/`country` tag
lists) live in localStorage.

### Database (`src/lib/db.ts`)

MongoDB via the native driver. A single `MongoClient` is cached on `globalThis`
(reused across requests and dev HMR). `MONGODB_URI`/`MONGODB_DB` are read lazily
(same getter-that-throws pattern as the other secrets). One collection, `users`,
holds one document per account with `lastAlbum`, `history`, `saved`,
`updatedAt`. `_id` (= the session `userId`) is the lowercased Last.fm username
for a Last.fm-only account, or `email:<address>` for an email account, which also
has `email`, `passwordHash`, `createdAt` and — once linked — `lastfmUsername` +
`lastfmKey` (lowercased; a unique partial index, created lazily in
`getUsersCollection`, keeps one Last.fm account on at most one email account).
`project()` in `userData.ts` never returns credentials. Only Node-runtime route
handlers touch it; the Edge middleware does not.

### Last.fm client (`src/lib/lastfm/`)

`client.ts` is the only place that talks HTTP to `ws.audioscrobbler.com`:

- `lastfmGet` — unsigned public reads (api_key only).
- `lastfmSignedGet` — signed POST (e.g. `auth.getSession`). `signParams` builds
  the `api_sig` md5 per spec (params sorted, `format`/`callback` excluded).
- Every request goes through `rateLimited` (`limiter.ts`, built with the shared
  `createRateLimiter` factory), a global FIFO queue enforcing ~250ms spacing
  (single server IP shares Last.fm's ~5 req/s limit), plus retry-with-backoff on
  rate-limit and transient errors (codes 29, 8, 11, 16, HTTP 5xx).
- Every upstream fetch (Last.fm, Discogs, CAA) has an `AbortSignal.timeout` and
  the shared `getUserAgent()` from `src/lib/userAgent.ts` (needs `APP_URL`); a
  hung request would otherwise block a limiter queue for everyone.

`user.ts` / `artist.ts` / `album.ts` are typed wrappers over specific Last.fm
methods; `types.ts` holds the response shapes. `pickImage` selects the largest
image from Last.fm's image array.

### Internationalization (`src/lib/i18n.ts`)

Dependency-free client i18n: a flat `pl`/`en` dictionary plus an interpolating
`translate`. `LanguageProvider` seeds from a `lang` cookie the server reads in
`layout.tsx`, so SSR and first client render match (no EN→PL flash). `setLang`
writes the cookie (1y) for the next server render. Recommendation reasons are
returned from the API as a structured `AlbumReason` union and translated on the
client, so switching language re-renders an already-shown album's reason without
a refetch.

The light/dark theme works the same way: `ThemeProvider` seeds from a `theme`
cookie read in `layout.tsx` (default `dark`, set as `data-theme` on `<html>`),
and `setTheme` writes the cookie (1y); a legacy localStorage `theme` is migrated
to the cookie once.

### Cover art (`src/lib/coverart.ts`)

Last.fm frequently returns a placeholder "star" image (detected by known md5
hashes). `resolveCover` returns real Last.fm CDN images (the client upgrades them to
600×600) and falls back to the Cover Art Archive when Last.fm only has a
placeholder: a `HEAD /release/<mbid>/front-500` (Last.fm mbids are release ids)
without following the redirect, cached 24h including a definite "no cover".
Returns `null` when nothing is found (UI shows its own placeholder). Covers are
plain `<img>` tags (no `next/image`).

### Auth & access control

Two independent, both-optional layers plus the (optional) account session:

1. **Password gate** (`src/middleware.ts` + `src/lib/gate.ts`) — runs on the
   Edge for every non-static path. When `ACCESS_PASSWORD` is set, requests
   without a valid gate cookie redirect to `/gate` (or 401 for `/api/*`). The
   gate cookie stores an HMAC token (`gateToken`), not the password; changing
   the password invalidates all cookies. Uses Web Crypto so it runs in both Edge
   and Node runtimes. `ACCESS_PASSWORD` must be ≥8 chars. `POST /api/gate`
   checks the password (throttled per IP) and sets the cookie; `DELETE
   /api/gate` re-locks (clears it).
2. **Account session** (`src/lib/session.ts`, iron-session) — an encrypted,
   httpOnly cookie (`next_album_session`, 30-day) holding `{ userId,
   lastfmUsername?, email? }`; `getCurrentUser()` reads it (a legacy cookie with
   only `username` maps to a Last.fm-only account). `/login` offers two ways in:
   - **Last.fm** — `/api/auth/login` redirects to Last.fm with a nonce in the
     callback URL, mirrored in a 10-min httpOnly cookie (`next_album_oauth_nonce`,
     `src/lib/oauth.ts`; login-CSRF defense, compared with `safeEqual`);
     `/api/auth/callback` verifies it, exchanges the token for the username
     (`auth.getSession`; the session key isn't kept) and
     `resolveLastfmLogin` maps it to the email account it's linked to, if any.
     `/api/auth/login?link=1` from a logged-in email account instead **links**
     Last.fm to it (`linkLastfm`: `?error=lastfm_taken` if another email account
     owns it; an existing Last.fm-only account's data is merged in and that
     document deleted).
   - **Email + password** — `POST /api/auth/register` / `POST /api/auth/email-login`
     (`src/lib/accounts.ts`; scrypt hashes in `src/lib/password.ts`; passwords
     8–200 chars; unknown emails still run a dummy hash). Registration is open
     (the gate still applies). Both routes are throttled in memory
     (`src/lib/throttle.ts`, shared with the gate): login per IP+email (5/15 min)
     and per IP (20/15 min), registration per IP (10/h).
3. **Last.fm username allowlist** (`src/lib/access.ts`) — checked in the callback
   (login and link). If `ALLOWED_LASTFM_USERS` is set and the account isn't on
   it, the session is not saved and the user is redirected with
   `?error=not_allowed`. It does not restrict email accounts.

`GET /api/me` returns the current account (`lastfmUsername`, `email`, avatar;
an email account's Last.fm link is refreshed from the DB);
`POST /api/auth/logout` clears it.

## Conventions

- Server-only secrets are read lazily from `process.env` inside getter functions
  (e.g. `getApiKey`, `getSessionPassword`) that throw a clear error when missing
  — not at module load. Follow this pattern for new env-dependent code.
- The in-process cache (`cache.ts`) is per-instance; it is not shared across
  multiple server instances. Fine for single-instance deploys. It stores the
  promise (concurrent callers share one load; failures aren't cached), sweeps
  expired entries and caps the store at 5000 entries. Keep cached values slim.
  TTLs: shared artist/album data 24h, user library 24h, profile 1h.
