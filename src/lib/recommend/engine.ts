import { cached } from '@/lib/cache';
import { getTopAlbums, getTopArtists, getRecentTracks, pickImage } from '@/lib/lastfm/user';
import { getSimilarArtists, getArtistTopAlbums } from '@/lib/lastfm/artist';
import { getAlbumInfo } from '@/lib/lastfm/album';
import { resolveCover } from '@/lib/coverart';
import { weightedPick } from './weighted';
import type { AlbumRecommendation, LastfmTopAlbum, LastfmTopArtist } from '@/lib/lastfm/types';

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

// ---------------------------------------------------------------------------
// Favorites (rediscovery)
// ---------------------------------------------------------------------------

/** A weighted-random album from the user's favorites, skipping recently played. */
async function recommendFavorites(profile: Profile): Promise<AlbumRecommendation | null> {
    const base = profile.topAlbums;
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
        source: 'lastfm',
        reason: { kind: 'rediscovery', playcount },
        playcount: playcount || null,
    };
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

/**
 * Discovery via similar artists: seed artist (from the user's top artists) →
 * Last.fm similar artists → drop the ones you already listen to → top album of
 * the picked artist.
 */
async function discoverFromSeeds(profile: Profile): Promise<AlbumRecommendation | null> {
    const seeds = profile.topArtists;
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
    const profile = await loadProfile(username);

    if (profile.topAlbums.length === 0 && profile.topArtists.length === 0) {
        throw new Error('No data in your Last.fm profile — listen to some music first.');
    }

    const goDiscovery = Math.random() < clamp01(opts.discovery);
    const favorites = () => recommendFavorites(profile);
    const discovery = () => discoverFromSeeds(profile);

    const primary = goDiscovery ? await discovery() : await favorites();
    if (primary) return primary;

    const fallback = goDiscovery ? await favorites() : await discovery();
    if (fallback) return fallback;

    throw new Error('Could not pick an album. Please try again.');
}

function clamp01(n: number): number {
    if (Number.isNaN(n)) return 0;
    return Math.min(1, Math.max(0, n));
}
