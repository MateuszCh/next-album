# next-album

A web app that **picks a specific album to listen to** based on your Last.fm
profile. The pick is profile-weighted and hybrid: a slider sets the balance
between **rediscovery** (an album from your favorites) and **discovery** (an
album by an artist similar to yours that you probably haven't heard yet).

The app is **multi-user** — everyone logs in with their own Last.fm account
(OAuth); there is no hardcoded single account.

## Stack

Next.js (App Router) + TypeScript. All Last.fm communication and request
signing happen on the server, so the `shared_secret` never reaches the
browser. The session (just the Last.fm username) lives in an encrypted,
httpOnly cookie (`iron-session`).

## Setup

1. Create a Last.fm API account: <https://www.last.fm/api/account/create> — you
   get an `API key` and `Shared secret`. In the app settings, set the **Callback
   URL** to `http://localhost:3000/api/auth/callback` (locally).
2. Copy `.env.example` to `.env.local` and fill in:
    - `LASTFM_API_KEY`, `LASTFM_SHARED_SECRET`
    - `APP_URL` (locally `http://localhost:3000`)
    - `SESSION_SECRET` — at least 32 chars, e.g. `openssl rand -base64 32`
3. Install and run:
    ```bash
    npm install
    npm run dev
    ```
4. Open <http://localhost:3000>, log in with Last.fm, and roll albums.

## Access control

The app can be restricted to specific people with two layers (both optional,
configured in `.env.local`):

- **Password gate** (`ACCESS_PASSWORD`) — a shared password required before
  entering the app. Enforced by `src/middleware.ts`: without a valid gate
  cookie every path redirects to `/gate`, and `/api/*` returns 401. Empty =
  gate disabled.
- **Last.fm username allowlist** (`ALLOWED_LASTFM_USERS`, comma-separated) —
  after OAuth, the callback checks whether the logged-in account is on the list;
  if not, the session is not saved and the user gets a message. Empty = every
  logged-in user has access.

The password controls "who can enter the app", the allowlist controls "which
specific Last.fm accounts". You can use both, one, or neither.

## How it works

- **Data**: after login the server fetches public profile data and caches it
  per user: the whole artist library (`user.getTopArtists`, ~24h), top albums
  of all time and of the last 3 months (`user.getTopAlbums`, ~1h) and the last
  few scrobbles (`user.getRecentTracks`, ~5 min).
- **Similarity**: taken ready-made from Last.fm (`artist.getSimilar`, with the
  `match` score).
- **Picking**: weighted — by playcount for favorites, by `match` for discovery
  (seeds by √playcount). Favorites skip albums played in the last 3 months;
  discovery skips artists you know (20+ plays) and albums you already played by
  artists you've only sampled. Both skip the albums in your recent roll
  history.
- **Cover art**: when Last.fm returns a placeholder, we fall back to the Cover
  Art Archive (500px thumbnail) by release `mbid`.

## Last.fm API limits

Last.fm enforces about **5 requests/s per IP** (exceeding it → error 29). All
requests go out from the server's IP, so the budget is shared. The app stays
within the limit via:

- **Global limiter** (`src/lib/lastfm/limiter.ts`) — serializes calls with a
  ~250 ms spacing (~4 req/s).
- **Retry with backoff** on error 29 / HTTP 429 and transient errors (8, 11, 16,
  HTTP 5xx); every request times out after 10 s (`src/lib/lastfm/client.ts`).
- **Caching**: library 24h, profile 1h, artist and album data (`getSimilar`,
  `getTopAlbums`, `album.getInfo`) 24h, user info 1h — reducing the number of
  real requests.
- **Attribution**: a "Powered by AudioScrobbler / Last.fm" footer + links to
  Last.fm pages (ToS requirement).

Usage is non-commercial. Per-user roll history and saved albums (album names,
links, cover URLs from Last.fm) are persisted in MongoDB, and Last.fm responses
are cached in memory — together they must stay within the ToS 100 MB cap on
stored Last.fm data.
