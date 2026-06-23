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
async function loadProfile(username: string): Promise<Profile> {
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
        reason: `From your favorites — played ${chosen.playcount}×.`,
        playcount: Number(chosen.playcount) || null,
    };
}

/**
 * Discovery: seed artist from top → similar artists (Last.fm) → drop the ones
 * you already listen to → top album of the chosen artist.
 */
async function recommendDiscovery(profile: Profile): Promise<AlbumRecommendation | null> {
    if (profile.topArtists.length === 0) return null;

    // Try a few seeds in case similar artists are empty or all already known.
    const seedPool = [...profile.topArtists];
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
            reason: `Something new — similar to "${seed.name}", who you listen to.`,
            playcount: null,
        };
    }

    return null;
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

function clamp01(n: number): number {
    if (Number.isNaN(n)) return 0;
    return Math.min(1, Math.max(0, n));
}
