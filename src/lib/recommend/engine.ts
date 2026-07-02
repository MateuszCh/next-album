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
    LastfmTagAlbum,
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

/** This week's artist chart, cached 1h per user (like the profile). */
function loadWeeklyArtists(username: string): Promise<LastfmWeeklyArtist[]> {
    return cached(`weekly:${username}`, () => getWeeklyArtistChart(username));
}

// ---------------------------------------------------------------------------
// Set helpers
// ---------------------------------------------------------------------------

function intersect(a: Set<string>, b: Set<string>): Set<string> {
    const out = new Set<string>();
    for (const x of a) if (b.has(x)) out.add(x);
    return out;
}

/** Union of the top artists (lowercased names) across a set of tags. */
async function unionTagArtists(tags: string[]): Promise<Set<string>> {
    const lists = await Promise.all(tags.map((t) => getTagTopArtists(t).catch(() => [])));
    const set = new Set<string>();
    for (const list of lists) for (const a of list) set.add(a.name.toLowerCase());
    return set;
}

// ---------------------------------------------------------------------------
// Favorites (rediscovery)
// ---------------------------------------------------------------------------

/**
 * A weighted-random album from the user's favorites, skipping recently played.
 * When `allowedArtists` is set, the pool is first narrowed to albums whose
 * artist is in that set (the combined genre/mood/decade/"now" filter). `filters`
 * is the list of applied tags, used only to build the localized reason.
 */
async function recommendFavorites(
    profile: Profile,
    allowedArtists: Set<string> | null,
    filters: string[],
    now: boolean,
): Promise<AlbumRecommendation | null> {
    const base = allowedArtists
        ? profile.topAlbums.filter((a) => allowedArtists.has(a.artist.name.toLowerCase()))
        : profile.topAlbums;
    if (base.length === 0) return null;

    const pool = base.filter((a) => !profile.recentAlbumKeys.has(albumKey(a.artist.name, a.name)));
    const candidates = pool.length > 0 ? pool : base;
    const chosen = weightedPick(candidates, (a) => Number(a.playcount) || 1);
    if (!chosen) return null;

    const imageUrl = await resolveCover(pickImage(chosen.image), chosen.mbid || null);
    const playcount = Number(chosen.playcount) || 0;

    return {
        name: chosen.name,
        artist: chosen.artist.name,
        url: chosen.url,
        imageUrl,
        mode: 'rediscovery',
        reason:
            allowedArtists !== null
                ? { kind: 'rediscovery_filtered', filters, now, playcount }
                : { kind: 'rediscovery', playcount },
        playcount: Number(chosen.playcount) || null,
    };
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

interface DiscoverReason {
    filtered: boolean;
    filters: string[];
    now: boolean;
}

/**
 * Discovery via similar artists: seed artist (from the given pool) → Last.fm
 * similar artists → drop the ones you already listen to → top album of the
 * picked artist. `restrictTo`, when set, keeps only discovered artists in that
 * set (the genre/mood/decade filter). Seeded from all-time top artists for the
 * unfiltered mix, or from this week's chart when "now" is on.
 */
async function discoverFromSeeds(
    profile: Profile,
    seeds: { name: string; playcount: string }[],
    restrictTo: Set<string> | null,
    reason: DiscoverReason,
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
        let candidates = fresh.length > 0 ? fresh : similar;
        if (restrictTo) {
            candidates = candidates.filter((s) => restrictTo.has(s.name.toLowerCase()));
        }
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
            reason: reason.filtered
                ? {
                      kind: 'discovery_filtered',
                      filters: reason.filters,
                      now: reason.now,
                      seedName: seed.name,
                  }
                : { kind: 'discovery', seedName: seed.name },
            playcount: null,
        };
    }

    return null;
}

/**
 * Discovery scoped to tags with no "now" seed: a weighted-random album from the
 * union of the selected tags' top albums, narrowed to artists that match every
 * dimension (`allowedArtists`) and dropping artists the user already listens to.
 * Weighted by list position since tag albums carry no playcount.
 */
async function discoverFromTagAlbums(
    profile: Profile,
    tags: string[],
    allowedArtists: Set<string>,
    filters: string[],
): Promise<AlbumRecommendation | null> {
    const lists = await Promise.all(tags.map((t) => getTagTopAlbums(t).catch(() => [])));
    const seen = new Set<string>();
    const albums: LastfmTagAlbum[] = [];
    for (const list of lists) {
        for (const a of list) {
            const key = albumKey(a.artist.name, a.name);
            if (!seen.has(key)) {
                seen.add(key);
                albums.push(a);
            }
        }
    }

    // AND across dimensions: keep albums whose artist matches every dimension.
    const inAllowed = albums.filter((a) => allowedArtists.has(a.artist.name.toLowerCase()));
    const base = inAllowed.length > 0 ? inAllowed : albums;
    if (base.length === 0) return null;

    // Prefer artists the user doesn't already listen to.
    const fresh = base.filter((a) => !profile.topArtistNames.has(a.artist.name.toLowerCase()));
    const candidates = fresh.length > 0 ? fresh : base;

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
        reason: { kind: 'discovery_filtered', filters, now: false },
        playcount: null,
    };
}

// ---------------------------------------------------------------------------
// Unified entry point
// ---------------------------------------------------------------------------

export interface RecommendOptions {
    discovery: number;
    genres: string[];
    moods: string[];
    decades: string[];
    now: boolean;
}

/**
 * The one recommendation entry point. Genre / mood / decade are optional
 * multi-select tag filters (OR within a dimension, AND across dimensions);
 * `now` restricts to artists on this week's chart. With no filters this is the
 * plain favorites/discovery mix. A coin flip on `discovery` (0–1) picks the mode
 * each roll, falling back to the other mode, then to `no_matches` when filters
 * leave nothing.
 */
export async function recommend(
    username: string,
    opts: RecommendOptions,
): Promise<AlbumRecommendation> {
    const profile = await loadProfile(username);

    if (profile.topAlbums.length === 0 && profile.topArtists.length === 0) {
        throw new Error('No data in your Last.fm profile — listen to some music first.');
    }

    const tagDimensions = [opts.genres, opts.moods, opts.decades].filter((d) => d.length > 0);
    const allTags = [...opts.genres, ...opts.moods, ...opts.decades];

    // Artists that match every selected tag dimension (OR within, AND across).
    let tagArtists: Set<string> | null = null;
    if (tagDimensions.length > 0) {
        const dimSets = await Promise.all(tagDimensions.map(unionTagArtists));
        tagArtists = dimSets.reduce<Set<string> | null>(
            (acc, s) => (acc ? intersect(acc, s) : s),
            null,
        );
    }

    // "Now": this week's artists. Narrows the favorites pool and seeds discovery.
    // With no weekly data (a fresh week) we drop the filter and degrade to the
    // normal mix rather than failing — matching the old "Right now" behavior.
    let weekly: LastfmWeeklyArtist[] = [];
    let weeklySet: Set<string> | null = null;
    if (opts.now) {
        weekly = await loadWeeklyArtists(username);
        if (weekly.length > 0) weeklySet = new Set(weekly.map((a) => a.name.toLowerCase()));
    }
    const nowActive = weeklySet !== null;

    // Favorites pool restriction = tag filter AND weekly filter (whichever apply).
    let favArtists: Set<string> | null = tagArtists;
    if (weeklySet) favArtists = favArtists ? intersect(favArtists, weeklySet) : weeklySet;

    const hasFilters = tagArtists !== null || nowActive;

    const favorites = () => recommendFavorites(profile, favArtists, allTags, nowActive);

    const discovery = () => {
        // Unfiltered: classic discovery from all-time top artists.
        if (!hasFilters) {
            return discoverFromSeeds(profile, profile.topArtists, null, {
                filtered: false,
                filters: [],
                now: false,
            });
        }
        // "Now": seed from this week's artists; tags restrict the discovered ones.
        if (nowActive) {
            return discoverFromSeeds(profile, weekly, tagArtists, {
                filtered: true,
                filters: allTags,
                now: true,
            });
        }
        // Tags only: draw from the tags' top albums (AND-narrowed by artist).
        return discoverFromTagAlbums(profile, allTags, tagArtists as Set<string>, allTags);
    };

    const goDiscovery = Math.random() < clamp01(opts.discovery);

    const primary = goDiscovery ? await discovery() : await favorites();
    if (primary) return primary;

    const fallback = goDiscovery ? await favorites() : await discovery();
    if (fallback) return fallback;

    if (hasFilters) throw new Error('no_matches');
    throw new Error('Could not pick an album. Please try again.');
}

function clamp01(n: number): number {
    if (Number.isNaN(n)) return 0;
    return Math.min(1, Math.max(0, n));
}
