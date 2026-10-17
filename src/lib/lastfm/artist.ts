import { lastfmGet } from './client';
import { cached } from '@/lib/cache';
import type { LastfmSimilarArtist, LastfmArtistAlbum } from './types';

// Artist data is shared across all users and changes over weeks, not minutes,
// so we cache it globally for a day to keep discovery from repeating the same
// Last.fm calls.
const ARTIST_TTL_MS = 24 * 60 * 60 * 1000;

interface SimilarResponse {
    similarartists?: { artist: LastfmSimilarArtist[] };
}

export type SimilarArtist = Pick<LastfmSimilarArtist, 'name' | 'match'>;

/**
 * Similar artists per Last.fm (with the precomputed `match` score). Only the
 * fields discovery uses are kept, so day-long cache entries stay small.
 */
export async function getSimilarArtists(artist: string, limit = 50): Promise<SimilarArtist[]> {
    return cached(
        `similar:${artist.toLowerCase()}:${limit}`,
        async () => {
            const data = await lastfmGet<SimilarResponse>('artist.getSimilar', {
                artist,
                limit,
                autocorrect: 1,
            });
            return (data.similarartists?.artist ?? []).map(({ name, match }) => ({ name, match }));
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
