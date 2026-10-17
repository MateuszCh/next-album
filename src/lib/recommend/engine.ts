import { cached } from '@/lib/cache';
import { getTopAlbums, getTopArtists, getRecentTracks, pickImage } from '@/lib/lastfm/user';
import { getSimilarArtists, getArtistTopAlbums } from '@/lib/lastfm/artist';
import { getAlbumInfo, getUserAlbumPlaycount } from '@/lib/lastfm/album';
import { resolveCover } from '@/lib/coverart';
import { albumKey, artistKey, artistKeys, recommendationKey } from '@/lib/identity';
import { weightedPick } from './weighted';
import type { AlbumRecommendation, LastfmArtistAlbum, LastfmTopAlbum } from '@/lib/lastfm/types';

// An artist the user played at least this often counts as known, so discovery
// never offers it as new. Below it an artist is at most "sampled" (a few
// tracks) and still fair game — but not an album the user already played.
const KNOWN_MIN_PLAYS = 20;
// Hard cap on the library fetch (1000 per page) — far beyond a real library.
const LIBRARY_LIMIT = 20_000;
// How many albums of a sampled artist to check for "already played" per seed.
const MAX_PLAYED_CHECKS = 3;
// Discovery seeds: the user's most played artists.
const SEED_COUNT = 200;
// Favorites pool: the user's most played albums of all time.
const FAVORITES_LIMIT = 500;
// Albums played in this period are "in rotation" — not a rediscovery.
const ROTATION_LIMIT = 1000;
// Catches what the rotation chart doesn't show yet (it lags by up to a day).
const RECENT_TRACKS_COUNT = 25;

const LIBRARY_TTL_MS = 24 * 60 * 60 * 1000;
const RECENT_TTL_MS = 5 * 60 * 1000;

interface Seed {
    name: string;
    plays: number;
}

/** The user's whole artist library: plays per `artistKey`, plus the seeds. */
interface Library {
    seeds: Seed[];
    plays: Map<string, number>;
}

/** A favorite album, with Last.fm's duplicate entries of it merged. */
interface Favorite {
    album: LastfmTopAlbum;
    key: string;
    plays: number;
}

interface Profile {
    favorites: Favorite[];
    rotationKeys: Set<string>;
}

/**
 * The user's artist library (cached 24h): every artist they ever played, with
 * playcounts — ~5 requests for a library of a few thousand artists. The library
 * changes slowly, so a day-old snapshot is fine for exclusion.
 */
function loadLibrary(username: string): Promise<Library> {
    return cached(
        `library:${username.toLowerCase()}`,
        async () => {
            const artists = await getTopArtists(username, {
                period: 'overall',
                limit: LIBRARY_LIMIT,
            });
            // Spelling variants of one artist share a key; their plays add up.
            const plays = new Map<string, number>();
            for (const a of artists) {
                const key = artistKey(a.name);
                plays.set(key, (plays.get(key) ?? 0) + (Number(a.playcount) || 0));
            }
            const seeds = artists
                .slice(0, SEED_COUNT)
                .map((a) => ({ name: a.name, plays: Number(a.playcount) || 1 }));
            return { seeds, plays };
        },
        LIBRARY_TTL_MS,
    );
}

/**
 * Top albums of all time (cached 1h), with duplicate entries of the same album
 * (remasters, deluxe editions, spelling variants) merged into one whose
 * playcount is their sum, plus the albums played in the last 3 months.
 */
function loadProfile(username: string): Promise<Profile> {
    return cached(`profile:${username.toLowerCase()}`, async () => {
        const [topAlbums, rotation] = await Promise.all([
            getTopAlbums(username, { period: 'overall', limit: FAVORITES_LIMIT }),
            getTopAlbums(username, { period: '3month', limit: ROTATION_LIMIT }),
        ]);

        // Sorted by playcount, so the first entry of a key is its most played one.
        const byKey = new Map<string, Favorite>();
        for (const album of topAlbums) {
            const key = albumKey(album.artist.name, album.name);
            const plays = Number(album.playcount) || 0;
            const existing = byKey.get(key);
            if (existing) existing.plays += plays;
            else byKey.set(key, { album, key, plays });
        }

        const rotationKeys = new Set(rotation.map((a) => albumKey(a.artist.name, a.name)));
        return { favorites: [...byKey.values()], rotationKeys };
    });
}

/** Albums of the last few scrobbles (cached 5 min). */
function loadRecentAlbumKeys(username: string): Promise<Set<string>> {
    return cached(
        `recent:${username.toLowerCase()}`,
        async () => {
            const recent = await getRecentTracks(username, RECENT_TRACKS_COUNT);
            return new Set(
                recent
                    .filter((t) => t.album?.['#text'])
                    .map((t) => albumKey(t.artist['#text'], t.album['#text'])),
            );
        },
        RECENT_TTL_MS,
    );
}

/** The user's plays of an artist; for a collaboration, of its most played part. */
function artistPlays(library: Library, name: string): number {
    return Math.max(...artistKeys(name).map((k) => library.plays.get(k) ?? 0));
}

// ---------------------------------------------------------------------------
// Favorites (rediscovery)
// ---------------------------------------------------------------------------

/**
 * A weighted-random album from the user's favorites that is out of rotation:
 * not played in the last 3 months or the last few scrobbles, and not among the
 * recently rolled albums. Returns null when every favorite is in rotation —
 * the caller then falls back to discovery.
 */
async function recommendFavorites(
    username: string,
    rolled: Set<string>,
): Promise<AlbumRecommendation | null> {
    const [profile, recent] = await Promise.all([
        loadProfile(username),
        loadRecentAlbumKeys(username),
    ]);

    const pool = profile.favorites.filter(
        (f) => !profile.rotationKeys.has(f.key) && !recent.has(f.key) && !rolled.has(f.key),
    );
    const chosen = weightedPick(pool, (f) => f.plays || 1);
    if (!chosen) return null;

    const { album, plays } = chosen;
    const imageUrl = await resolveCover(pickImage(album.image), album.mbid || null);

    return {
        name: album.name,
        artist: album.artist.name,
        url: album.url,
        imageUrl,
        mode: 'rediscovery',
        source: 'lastfm',
        reason: { kind: 'rediscovery', playcount: plays },
        playcount: plays || null,
    };
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

/**
 * A weighted-random album of a discovered artist. For an artist the user has
 * sampled (some plays, below KNOWN_MIN_PLAYS) the most popular album is likely
 * the one they heard, so each pick is checked against the user's own playcount
 * and skipped if played. Returns null when nothing unplayed turns up.
 */
async function pickUnplayedAlbum(
    username: string,
    artist: string,
    albums: LastfmArtistAlbum[],
    sampled: boolean,
): Promise<LastfmArtistAlbum | null> {
    const pool = [...albums];
    for (let check = 0; check < MAX_PLAYED_CHECKS; check++) {
        const album = weightedPick(pool, (a) => Number(a.playcount) || 1);
        if (!album || !sampled) return album;
        const played = await getUserAlbumPlaycount(username, artist, album.name).catch(() => 0);
        if (played === 0) return album;
        pool.splice(pool.indexOf(album), 1);
    }
    return null;
}

/**
 * Discovery via similar artists: seed artist (from the user's top artists) →
 * Last.fm similar artists → drop the artists the user knows (KNOWN_MIN_PLAYS+)
 * → an album of the picked artist the user hasn't played. Seeds are weighted
 * by √playcount so a few dominant artists don't own most of the rolls.
 */
async function discoverFromSeeds(
    username: string,
    rolled: Set<string>,
): Promise<AlbumRecommendation | null> {
    const library = await loadLibrary(username);
    if (library.seeds.length === 0) return null;

    // Try a few seeds in case similar artists are empty or all already known.
    const seedPool = [...library.seeds];
    for (let attempt = 0; attempt < 5 && seedPool.length > 0; attempt++) {
        const seed = weightedPick(seedPool, (s) => Math.sqrt(s.plays));
        if (!seed) break;
        // remove the seed from the pool so we don't retry it
        seedPool.splice(seedPool.indexOf(seed), 1);

        let similar;
        try {
            similar = await getSimilarArtists(seed.name, 50);
        } catch {
            continue;
        }

        // Only new or barely sampled artists — never fall back to known ones,
        // which would be mislabeled as a discovery.
        const fresh = similar.filter((s) => artistPlays(library, s.name) < KNOWN_MIN_PLAYS);
        const pickedArtist = weightedPick(fresh, (s) => (Number(s.match) || 0.01) * 100);
        if (!pickedArtist) continue;

        let albums;
        try {
            albums = await getArtistTopAlbums(pickedArtist.name, 20);
        } catch {
            continue;
        }

        const unseen = albums.filter((a) => !rolled.has(albumKey(pickedArtist.name, a.name)));
        const sampled = artistPlays(library, pickedArtist.name) > 0;
        const album = await pickUnplayedAlbum(username, pickedArtist.name, unseen, sampled);
        if (!album) continue;

        // The top-albums list often lacks covers/mbid — pull the details.
        let imageUrl = pickImage(album.image);
        let mbid = album.mbid || null;
        let url = album.url;
        try {
            const info = await getAlbumInfo(pickedArtist.name, album.name);
            if (info) {
                imageUrl = info.imageUrl ?? imageUrl;
                mbid = info.mbid ?? mbid;
                url = info.url ?? url;
            }
        } catch {
            // fall back to the data from the list
        }

        const cover = await resolveCover(imageUrl, mbid);

        return {
            name: album.name,
            artist: pickedArtist.name,
            url,
            imageUrl: cover,
            mode: 'discovery',
            source: 'lastfm',
            reason: { kind: 'discovery', seedName: seed.name },
            playcount: null,
        };
    }

    return null;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export interface RecommendOptions {
    discovery: number;
    /** Recently rolled albums (the stored history) — never offered again. */
    recentRolls?: AlbumRecommendation[];
}

/**
 * The one recommendation entry point for the Last.fm mode. A coin flip on
 * `discovery` (0–1) picks favorites or discovery each roll, falling back to the
 * other mode when the chosen one yields nothing.
 */
export async function recommend(
    username: string,
    opts: RecommendOptions,
): Promise<AlbumRecommendation> {
    const rolled = new Set((opts.recentRolls ?? []).map(recommendationKey));

    const goDiscovery = Math.random() < clamp01(opts.discovery);
    const favorites = () => recommendFavorites(username, rolled);
    const discovery = () => discoverFromSeeds(username, rolled);

    const primary = goDiscovery ? await discovery() : await favorites();
    if (primary) return primary;

    const fallback = goDiscovery ? await favorites() : await discovery();
    if (fallback) return fallback;

    throw new Error('Could not pick an album (empty profile or nothing new to offer).');
}

function clamp01(n: number): number {
    if (Number.isNaN(n)) return 0;
    return Math.min(1, Math.max(0, n));
}
