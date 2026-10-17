import { lastfmGet } from './client';
import { pickImage } from './user';
import { cached } from '@/lib/cache';
import type { LastfmImage } from './types';

// Album details are shared across users and practically static; both modes look
// them up on every roll (covers, mbid), so cache them for a day.
const ALBUM_TTL_MS = 24 * 60 * 60 * 1000;

interface AlbumInfoResponse {
    album?: {
        name: string;
        artist: string;
        url: string;
        mbid?: string;
        image: LastfmImage[];
        // Present only when the request names a user.
        userplaycount?: number | string;
    };
}

export function getAlbumInfo(
    artist: string,
    album: string,
): Promise<{
    name: string;
    artist: string;
    url: string;
    mbid: string | null;
    imageUrl: string | null;
} | null> {
    return cached(
        `albumInfo:${artist.toLowerCase()}:${album.toLowerCase()}`,
        async () => {
            const data = await lastfmGet<AlbumInfoResponse>('album.getInfo', {
                artist,
                album,
                autocorrect: 1,
            });
            if (!data.album) return null;
            return {
                name: data.album.name,
                artist: data.album.artist,
                url: data.album.url,
                mbid: data.album.mbid || null,
                imageUrl: pickImage(data.album.image),
            };
        },
        ALBUM_TTL_MS,
    );
}

/**
 * How many times `username` played this album (0 if never or unknown). Cached
 * per user for an hour — separate from `getAlbumInfo`, which is shared.
 */
export function getUserAlbumPlaycount(
    username: string,
    artist: string,
    album: string,
): Promise<number> {
    return cached(
        `albumPlays:${username.toLowerCase()}:${artist.toLowerCase()}:${album.toLowerCase()}`,
        async () => {
            const data = await lastfmGet<AlbumInfoResponse>('album.getInfo', {
                artist,
                album,
                username,
                autocorrect: 1,
            });
            return Number(data.album?.userplaycount) || 0;
        },
    );
}
