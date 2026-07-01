import { cached } from '@/lib/cache';
import {
    getTopAlbums,
    getTopArtists,
    getRecentTracks,
    getWeeklyArtistChart,
    pickImage,
} from '@/lib/lastfm/user';
import { getSimilarArtists, getArtistTopAlbums } from '@/lib/lastfm/artist';
import { getAlbumInfo } from '@/lib/lastfm/album';
import { getTagTopAlbums, getTagTopArtists } from '@/lib/lastfm/tag';
import { resolveCover } from '@/lib/coverart';
import { weightedPick } from './weighted';
import type {
    AlbumRecommendation,
    LastfmTopAlbum,
    LastfmTopArtist,
    LastfmWeeklyArtist,
} from '@/lib/lastfm/types';

const RECENT_FILTER_COUNT = 25;

function albumKey(artist: string, album: string): string {
    return `${artist}::${album}`.toLowerCase();
}

interface Profile {
    topAlbums: LastfmTopAlbum[];
    topArtists: LastfmTopArtist[];
    recentAlbumKeys: Set<string>;
    topArtistNames: Set<string>;
}

/**
 * Fetches and caches the user's profile (1h). Subsequent rolls reuse the same
 * data, so they are instant.
 */
export async function loadProfile(username: string): Promise<Profile> {
    return cached(`profile:${username}`, async () => {
        const [topAlbums, topArtists, recent] = await Promise.all([
            getTopAlbums(username, { period: 'overall', limit: 500 }),
            getTopArtists(username, { period: 'overall', limit: 200 }),
            getRecentTracks(username, RECENT_FILTER_COUNT),
        ]);

        const recentAlbumKeys = new Set(
            recent
                .filter((t) => t.album?.['#text'])
                .map((t) => albumKey(t.artist['#text'], t.album['#text'])),
        );
        const topArtistNames = new Set(topArtists.map((a) => a.name.toLowerCase()));

        return { topAlbums, topArtists, recentAlbumKeys, topArtistNames };
    });
}

/**
 * Rediscovery: a weighted random album from favorites, skipping recently played.
 */
async function recommendRediscovery(profile: Profile): Promise<AlbumRecommendation | null> {
    const pool = profile.topAlbums.filter(
        (a) => !profile.recentAlbumKeys.has(albumKey(a.artist.name, a.name)),
    );
    const candidates = pool.length > 0 ? pool : profile.topAlbums;
    const chosen = weightedPick(candidates, (a) => Number(a.playcount) || 1);
    if (!chosen) return null;

    const imageUrl = await resolveCover(pickImage(chosen.image), chosen.mbid || null);

    return {
        name: chosen.name,
        artist: chosen.artist.name,
        url: chosen.url,
        imageUrl,
        mode: 'rediscovery',
        reason: { kind: 'rediscovery', playcount: Number(chosen.playcount) || 0 },
        playcount: Number(chosen.playcount) || null,
    };
}

/**
 * Discovery: seed artist (from the given pool) → similar artists (Last.fm) →
 * drop the ones you already listen to → top album of the chosen artist. Shared
 * by the standard discovery mode (seeded from all-time top artists) and the
 * "Right now" mode (seeded from this week's chart).
 */
async function discoverFromSeeds(
    profile: Profile,
    seeds: { name: string; playcount: string }[],
    reasonKind: 'discovery' | 'current_discovery',
): Promise<AlbumRecommendation | null> {
    if (seeds.length === 0) return null;

    // Try a few seeds in case similar artists are empty or all already known.
    const seedPool = [...seeds];
    for (let attempt = 0; attempt < 5 && seedPool.length > 0; attempt++) {
        const seed = weightedPick(seedPool, (a) => Number(a.playcount) || 1);
        if (!seed) break;
        // remove the seed from the pool so we don't retry it
        seedPool.splice(seedPool.indexOf(seed), 1);

        let similar;
        try {
            similar = await getSimilarArtists(seed.name, 50);
        } catch {
            continue;
        }

        const fresh = similar.filter((s) => !profile.topArtistNames.has(s.name.toLowerCase()));
        const candidates = fresh.length > 0 ? fresh : similar;
        if (candidates.length === 0) continue;

        const pickedArtist = weightedPick(candidates, (s) => (Number(s.match) || 0.01) * 100);
        if (!pickedArtist) continue;

        let albums;
        try {
            albums = await getArtistTopAlbums(pickedArtist.name, 20);
        } catch {
            continue;
        }
        if (albums.length === 0) continue;

        const album = weightedPick(albums, (a) => Number(a.playcount) || 1);
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
            reason: { kind: reasonKind, seedName: seed.name },
            playcount: null,
        };
    }

    return null;
}

/** Standard discovery, seeded from the user's all-time top artists. */
function recommendDiscovery(profile: Profile): Promise<AlbumRecommendation | null> {
    return discoverFromSeeds(profile, profile.topArtists, 'discovery');
}

/**
 * Genre favorites: a weighted random album from the user's favorites whose
 * artist belongs to the genre (per Last.fm's top artists for the tag).
 */
async function recommendGenreFavorites(
    profile: Profile,
    genreTag: string,
    label: string,
): Promise<AlbumRecommendation | null> {
    let genreArtists;
    try {
        genreArtists = await getTagTopArtists(genreTag);
    } catch {
        return null;
    }
    const genreArtistNames = new Set(genreArtists.map((a) => a.name.toLowerCase()));

    const inGenre = profile.topAlbums.filter((a) =>
        genreArtistNames.has(a.artist.name.toLowerCase()),
    );
    if (inGenre.length === 0) return null;

    const pool = inGenre.filter(
        (a) => !profile.recentAlbumKeys.has(albumKey(a.artist.name, a.name)),
    );
    const candidates = pool.length > 0 ? pool : inGenre;
    const chosen = weightedPick(candidates, (a) => Number(a.playcount) || 1);
    if (!chosen) return null;

    const imageUrl = await resolveCover(pickImage(chosen.image), chosen.mbid || null);

    return {
        name: chosen.name,
        artist: chosen.artist.name,
        url: chosen.url,
        imageUrl,
        mode: 'rediscovery',
        reason: { kind: 'rediscovery_genre', genre: label, playcount: Number(chosen.playcount) || 0 },
        playcount: Number(chosen.playcount) || null,
        genre: label,
    };
}

/**
 * Genre discovery: a weighted random album from the genre's top albums,
 * dropping artists the user already listens to. Weighted by list position
 * (Last.fm returns no playcount for tag albums) so iconic albums come up more.
 */
async function recommendGenreDiscovery(
    profile: Profile,
    genreTag: string,
    label: string,
): Promise<AlbumRecommendation | null> {
    let albums;
    try {
        albums = await getTagTopAlbums(genreTag);
    } catch {
        return null;
    }
    if (albums.length === 0) return null;

    const fresh = albums.filter((a) => !profile.topArtistNames.has(a.artist.name.toLowerCase()));
    const candidates = fresh.length > 0 ? fresh : albums;

    // Higher weight for earlier (more popular) entries.
    const chosen = weightedPick(candidates, (a) => candidates.length - candidates.indexOf(a));
    if (!chosen) return null;

    // The tag list lacks covers/mbid — pull the album details.
    let imageUrl = pickImage(chosen.image);
    let mbid = chosen.mbid || null;
    let url = chosen.url;
    try {
        const info = await getAlbumInfo(chosen.artist.name, chosen.name);
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
        name: chosen.name,
        artist: chosen.artist.name,
        url,
        imageUrl: cover,
        mode: 'discovery',
        reason: { kind: 'discovery_genre', genre: label },
        playcount: null,
        genre: label,
    };
}

/**
 * Tag-dimension entry point (genre / mood / decade): same discovery/rediscovery
 * coin flip as `recommendAlbum`, but scoped to a Last.fm tag. `label` is the
 * display name resolved by the caller. Falls back to the other mode if one is
 * empty.
 */
export async function recommendByTag(
    username: string,
    discovery: number,
    tag: string,
    label: string,
): Promise<AlbumRecommendation> {
    const profile = await loadProfile(username);

    if (profile.topAlbums.length === 0 && profile.topArtists.length === 0) {
        throw new Error('No data in your Last.fm profile — listen to some music first.');
    }

    const goDiscovery = Math.random() < clamp01(discovery);

    const primary = goDiscovery
        ? await recommendGenreDiscovery(profile, tag, label)
        : await recommendGenreFavorites(profile, tag, label);
    if (primary) return primary;

    const fallback = goDiscovery
        ? await recommendGenreFavorites(profile, tag, label)
        : await recommendGenreDiscovery(profile, tag, label);
    if (fallback) return fallback;

    throw new Error(`No ${label} albums found — try another.`);
}

/**
 * Main entry point: a coin flip on `discovery` (0–1) decides the mode.
 * If discovery fails we fall back to rediscovery (and vice versa).
 */
export async function recommendAlbum(
    username: string,
    discovery: number,
): Promise<AlbumRecommendation> {
    const profile = await loadProfile(username);

    if (profile.topAlbums.length === 0 && profile.topArtists.length === 0) {
        throw new Error('No data in your Last.fm profile — listen to some music first.');
    }

    const goDiscovery = Math.random() < clamp01(discovery);

    const primary = goDiscovery
        ? await recommendDiscovery(profile)
        : await recommendRediscovery(profile);
    if (primary) return primary;

    const fallback = goDiscovery
        ? await recommendRediscovery(profile)
        : await recommendDiscovery(profile);
    if (fallback) return fallback;

    throw new Error('Could not pick an album. Please try again.');
}

/** This week's artist chart, cached 1h per user (like the profile). */
function loadWeeklyArtists(username: string): Promise<LastfmWeeklyArtist[]> {
    return cached(`weekly:${username}`, () => getWeeklyArtistChart(username));
}

/**
 * "Right now" favorites: a weighted random album from the user's favorites whose
 * artist appears in this week's chart — i.e. tied to what they're spinning now.
 */
async function recommendCurrentFavorites(
    profile: Profile,
    weekly: LastfmWeeklyArtist[],
): Promise<AlbumRecommendation | null> {
    const weeklyNames = new Set(weekly.map((a) => a.name.toLowerCase()));
    const inWeek = profile.topAlbums.filter((a) => weeklyNames.has(a.artist.name.toLowerCase()));
    if (inWeek.length === 0) return null;

    const pool = inWeek.filter(
        (a) => !profile.recentAlbumKeys.has(albumKey(a.artist.name, a.name)),
    );
    const candidates = pool.length > 0 ? pool : inWeek;
    const chosen = weightedPick(candidates, (a) => Number(a.playcount) || 1);
    if (!chosen) return null;

    const imageUrl = await resolveCover(pickImage(chosen.image), chosen.mbid || null);

    return {
        name: chosen.name,
        artist: chosen.artist.name,
        url: chosen.url,
        imageUrl,
        mode: 'rediscovery',
        reason: { kind: 'current_favorite', playcount: Number(chosen.playcount) || 0 },
        playcount: Number(chosen.playcount) || null,
    };
}

/**
 * "Right now" entry point: same coin flip as `recommendAlbum`, but anchored to
 * this week's listening — favorites tied to the weekly chart, or discovery
 * seeded from the artists you're currently into. Falls back to the standard mix
 * when there's no usable weekly data (e.g. a fresh week).
 */
export async function recommendCurrent(
    username: string,
    discovery: number,
): Promise<AlbumRecommendation> {
    const profile = await loadProfile(username);

    if (profile.topAlbums.length === 0 && profile.topArtists.length === 0) {
        throw new Error('No data in your Last.fm profile — listen to some music first.');
    }

    const weekly = await loadWeeklyArtists(username);
    if (weekly.length > 0) {
        const goDiscovery = Math.random() < clamp01(discovery);

        const primary = goDiscovery
            ? await discoverFromSeeds(profile, weekly, 'current_discovery')
            : await recommendCurrentFavorites(profile, weekly);
        if (primary) return primary;

        const fallback = goDiscovery
            ? await recommendCurrentFavorites(profile, weekly)
            : await discoverFromSeeds(profile, weekly, 'current_discovery');
        if (fallback) return fallback;
    }

    // No usable weekly data — fall back to the standard mix.
    return recommendAlbum(username, discovery);
}

function clamp01(n: number): number {
    if (Number.isNaN(n)) return 0;
    return Math.min(1, Math.max(0, n));
}
