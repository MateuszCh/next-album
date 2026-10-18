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
`/api/user-data` fails and history/saved/last-album stop persisting, and the
upstream cache is memory-only (the rest works — graceful degradation).

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
listen to, in **two modes** (the Dla mnie / Szukaj switch on the Losuj screen,
`src/app/(app)/page.tsx`, remembered in localStorage `appMode`):

- **For me** (`lastfm`) — from the user's Last.fm profile, steered only by the
  favorites ↔ discovery slider. No filters. Needs a Last.fm username: a Last.fm
  login, or an email account with Last.fm linked (otherwise the tab shows a
  login / "Connect Last.fm" hero).
- **Find an album** (`search`) — a random well-loved album from **Discogs** for
  genre / decade / country filters. No slider and **no login needed**.

Logging in is optional (Konto → Zaloguj się at `/account`: Last.fm, or email +
password; `/login` redirects there). See "Auth & access control". The UI comes in
two user-selectable skins — see "UI: skins, tabs and theming".

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
collected first (`sort=have`). `searchAlbum` gets the page count from
`getPageCount` (cached on its own, so a warm roll fetches only the page it draws,
not page 1 first; 0 pages = an empty combination, also cached), picks a page
among the first 10 (50 per page; weight `1/page`, so deep, rarely-owned pages
are rare), then an album weighted by `sqrt(have) + 1`; an empty combination is
redrawn up to 3 times before `no_matches`. Discogs titles are `Artist - Album`; the artist is
cleaned of Discogs' disambiguation suffixes (`*`, ` (2)`). The reason is
`{ kind: 'search', filters, have }`.

`discogs.ts` sends a `User-Agent` built from `APP_URL` (required by Discogs) and
the optional `DISCOGS_TOKEN` (`Authorization: Discogs token=…`). Requests go
through their own `createRateLimiter` queue — 2.4 s spacing anonymous (25
req/min), 1 s with a token (60 req/min) — retry a 429 once. Result pages
(slimmed to the fields the search uses) and page counts are kept for 7 days in
the two-level cache (`persistentCached`, see Database), keyed separately for
anonymous and token requests. **Anonymous requests get no cover images**
(Discogs serves images only to token requests), so `coverFor` falls back to
Last.fm `album.getInfo` art (API key only, no account) and then the Cover Art
Archive via `resolveCover`.

The client prefetches in search mode: after showing an album, `AppDataProvider` fetches
the next one for the same URL in the background (and warms both cover sizes), and
the next roll uses it if the URL still matches and it isn't the album on screen.
Not done in For me mode — a prefetch would bypass the server's recent-rolls check.

### History & saved albums

Every roll (both modes) is pushed to a capped (50) history list and set as the
last album; the star toggles an album into a saved list. The Historia
(`/history`, filterable by mode) and Ulubione (`/saved`, a cover grid) tabs
re-open a past album on Losuj without a refetch (recommendations are
JSON-serializable; `AlbumRecommendation.mode` is `rediscovery` / `discovery` /
`search`, `source` is `lastfm` / `discogs`).

`src/lib/history.ts` exposes one `UserDataStore` interface with two backends,
picked by `AppDataProvider` (`src/components/AppDataProvider.tsx`, in the
`(app)` layout), which owns the account, the shown album, history/saved, the pick
preferences and the roll + prefetch for every tab, so switching tabs keeps them
(including a roll in flight):

- **Logged in** — `remoteStore`: per account in MongoDB (keyed by the session
  `userId`) via `/api/user-data`. Server logic in `src/lib/userData.ts` (`GET`
  returns `{ lastAlbum, history, saved }`; `POST` dispatches on an `action`
  discriminator: `push` / `set-last` / `toggle-saved` / `remove-saved` /
  `merge`).
- **Logged out** — `guestStore`: the same data in localStorage (`guestData`).
  After any login the provider calls `mergeGuestData()` (`action: 'merge'`), which
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

A second collection, `cache`, is the persistent L2 behind the in-process cache:
`persistentCached(key, loader, ttlMs)` (`src/lib/persistentCache.ts`) wraps
`cached` and, on an L1 miss, reads `{ _id: key, value, expiresAt }` from Mongo
before calling the loader, then upserts the result fire-and-forget (a TTL index
on `expiresAt`, created lazily in `getCacheCollection`, removes expired
entries). Reads are capped at 500 ms and any failure skips Mongo for 30 s, so
without a (reachable) database it degrades to L1 only. Used for shared upstream
data that should survive a restart or an idle Passenger process: Discogs pages
and page counts, Last.fm `album.getInfo`, Cover Art Archive lookups.

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
a refetch. Counts with plural forms ("12 albumów") go through `countLabel`
(`Intl.PluralRules`, keys `<key>.one|few|many|other`).

### UI: skins, tabs and theming

The UI is a phone-first column (`--app-max` 560px) with a fixed bottom nav, in
one of two **skins** the user picks in Konto → Ustawienia. The look comes from
the Next Album design system (Design System artifact
https://claude.ai/artifact/2kUR2FZqPfrVT5x2sPmrN8 — tokens.json and the Skins
components are the source of truth for colours, type and sizes).

- **Themes.** `data-theme` on `<html>` is one of `okladka-dark`,
  `okladka-light` (Okładka: cover-first, coral `#ff7a59`) or `tuner` (hi-fi
  hardware, amber `#ffb000` LCD, dark only). It is derived by `themeFor()` in
  `src/lib/skin.ts` from two cookies (1y): `skin` (`okladka` | `tuner`, default
  `okladka`) and `theme` (the mode, `dark` | `light`, default `dark`). Tuner
  ignores the mode (Ustawienia disables "Jasny"), and switching back to Okładka
  restores the stored mode. `layout.tsx` reads both cookies so SSR renders the
  right theme with no flash; `ThemeProvider` exposes `skin`, `mode`, `theme`,
  `setSkin`, `setMode`, writes the cookies and sets `data-theme` in a layout
  effect (a legacy localStorage `theme` is migrated to the cookie once).
- **Tokens and styles** live in `src/app/globals.css`: one token block per
  theme (`okladka-dark` is also the `:root` fallback), then theme-independent
  shape/size tokens (`--radius-*`, `--play-button`, `--next-key`,
  `--bottom-nav`, `--touch-min`, …), then component styles. Tuner differences
  are rules scoped with `[data-theme='tuner']`; the Tuner LED (`.led`) is hidden
  in Okładka.
- **Fonts** (`next/font` in `layout.tsx`): Bricolage Grotesque + DM Sans for
  Okładka (preloaded), Martian Mono (with the `wdth` axis for the condensed
  `font-stretch: 85%` titles) + Instrument Sans for Tuner (`preload: false`).
  They are exposed as `--font-okladka-display/-sans` and
  `--font-tuner-mono/-sans`, and each theme maps them onto `--font-display` /
  `--font-sans`.
- **Routes.** The tabs are the route group `src/app/(app)/`, whose layout wraps
  them in `AppDataProvider` and renders `BottomNav`: Losuj (`/`), Historia
  (`/history`), Ulubione (`/saved`), Konto (`/account` — Profil | Ustawienia
  when logged in, Zaloguj się | Ustawienia for guests; Ustawienia holds the
  `StylePicker`, Motyw, Język and the data credits). `/gate` stays outside the
  group (no nav); `/login` redirects to `/account`.
- **Skin-variant components** pick their rendering from `useTheme().skin`,
  never per screen: `AlbumCard` (full-width cover / LCD readout, plus
  `AlbumEmpty`), `NextButton` (round play with save + settings / full-width
  key), `ModeSlider` (slider / tuning scale with a needle), `BottomNav` (pill /
  lit key), `ListenLinks` (pill links / a key row with Save), `SearchFilters`
  (genre chips / preset keys collapsed to "+ N", decade and country tiles /
  knobs that unfold a multi-select list) and `Logo`. `Segmented` (tabs/radios)
  and `StylePicker` (live thumbnails that carry their own `data-theme`) are
  shared.
- **Icons follow the skin.** `generateMetadata` in `layout.tsx` links the saved
  skin's favicon and Apple touch icon from the `skin` cookie (`SKIN_ICONS` in
  `src/lib/skin.ts`), so the server HTML is right on first load — iOS keeps the
  touch icon it reads when a home-screen shortcut is added. Favicons are
  `public/favicon-okladka.svg` / `public/favicon-tuner.svg`; the touch icons are
  opaque 180px PNGs from `src/app/apple-touch-icon/[skin]/route.tsx`
  (`ImageResponse`, prerendered for both skins, the favicon artwork full-bleed).
  Declaring `icons` replaces Next's file-based icons, so there is no
  `app/icon.svg` / `app/apple-icon`; `public/favicon.ico` (Okładka) is only the
  unlinked fallback. On a live switch `ThemeProvider` repoints both links. The
  middleware matcher lets all icon paths through the gate.

### Cover art (`src/lib/coverart.ts`)

Last.fm frequently returns a placeholder "star" image (detected by known md5
hashes). `resolveCover` returns real Last.fm CDN images (the client upgrades them to
600×600) and falls back to the Cover Art Archive when Last.fm only has a
placeholder: a `HEAD /release/<mbid>/front-500` (Last.fm mbids are release ids)
without following the redirect, cached 7 days (memory + Mongo) including a
definite "no cover". Returns `null` when nothing is found (UI shows its own
placeholder). Covers are plain `<img>` tags (no `next/image`). The client-side
`upgradeLastfmImage` lives in `src/lib/coverUrl.ts`, apart from `coverart.ts`,
which is server-only (it pulls in the MongoDB driver) — client components must
not import it.

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
   only `username` maps to a Last.fm-only account). Konto (`/account`, guest
   tab) offers two ways in:
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
  TTLs: album info 7 days, artist data 24h, user library 24h, profile 1h.
- Shared, user-independent upstream data → `persistentCached` (memory + Mongo);
  per-user data → `cached` only.
