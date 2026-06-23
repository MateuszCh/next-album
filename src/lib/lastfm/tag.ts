import { lastfmGet } from './client';
import { cached } from '@/lib/cache';
import type { LastfmTagAlbum, LastfmTagArtist } from './types';

// Tag (genre) data is shared across all users and rarely changes, so we cache
// it globally for ~10 min — same policy as artist data.
const TAG_TTL_MS = 10 * 60 * 1000;

interface TagTopAlbumsResponse {
    albums?: { album: LastfmTagAlbum[] };
}

/**
 * Top albums for a Last.fm tag (genre), ordered by popularity. Note: Last.fm
 * does not return a playcount for these, so callers weight by list position.
 */
export async function getTagTopAlbums(tag: string, limit = 200): Promise<LastfmTagAlbum[]> {
    return cached(
        `tagTopAlbums:${tag.toLowerCase()}:${limit}`,
        async () => {
            const data = await lastfmGet<TagTopAlbumsResponse>('tag.getTopAlbums', { tag, limit });
            return (data.albums?.album ?? []).filter(
                // drop "(null)" / empty names that Last.fm sometimes returns
                (a) => a.name && a.name.toLowerCase() !== '(null)',
            );
        },
        TAG_TTL_MS,
    );
}

interface TagTopArtistsResponse {
    topartists?: { artist: LastfmTagArtist[] };
}

/**
 * Top artists for a Last.fm tag (genre). Used both to mark genres as
 * "for you" (intersection with the user's library) and to decide whether a
 * favorite album belongs to the genre.
 */
export async function getTagTopArtists(tag: string, limit = 500): Promise<LastfmTagArtist[]> {
    return cached(
        `tagTopArtists:${tag.toLowerCase()}:${limit}`,
        async () => {
            const data = await lastfmGet<TagTopArtistsResponse>('tag.getTopArtists', {
                tag,
                limit,
            });
            return data.topartists?.artist ?? [];
        },
        TAG_TTL_MS,
    );
}
