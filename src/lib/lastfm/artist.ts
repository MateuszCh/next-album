import { lastfmGet } from './client';
import { cached } from '@/lib/cache';
import type { LastfmSimilarArtist, LastfmArtistAlbum } from './types';

// Artist data is shared across all users and rarely changes, so we cache it
// globally for ~10 min to keep discovery from repeating the same Last.fm calls.
const ARTIST_TTL_MS = 10 * 60 * 1000;

interface SimilarResponse {
    similarartists?: { artist: LastfmSimilarArtist[] };
}

/**
 * Similar artists per Last.fm (with the precomputed `match` score).
 */
export async function getSimilarArtists(
    artist: string,
    limit = 50,
): Promise<LastfmSimilarArtist[]> {
    return cached(
        `similar:${artist.toLowerCase()}:${limit}`,
        async () => {
            const data = await lastfmGet<SimilarResponse>('artist.getSimilar', {
                artist,
                limit,
                autocorrect: 1,
            });
            return data.similarartists?.artist ?? [];
        },
        ARTIST_TTL_MS,
    );
}

interface TopAlbumsResponse {
    topalbums?: { album: LastfmArtistAlbum[] };
}

export async function getArtistTopAlbums(artist: string, limit = 20): Promise<LastfmArtistAlbum[]> {
    return cached(
        `artistTopAlbums:${artist.toLowerCase()}:${limit}`,
        async () => {
            const data = await lastfmGet<TopAlbumsResponse>('artist.getTopAlbums', {
                artist,
                limit,
                autocorrect: 1,
            });
            return (data.topalbums?.album ?? []).filter(
                // drop "(null)" / empty names that Last.fm sometimes returns
                (a) => a.name && a.name.toLowerCase() !== '(null)',
            );
        },
        ARTIST_TTL_MS,
    );
}
