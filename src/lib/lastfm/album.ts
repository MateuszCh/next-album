import { lastfmGet } from './client';
import { pickImage } from './user';
import type { LastfmImage } from './types';

interface AlbumInfoResponse {
    album?: {
        name: string;
        artist: string;
        url: string;
        mbid?: string;
        image: LastfmImage[];
    };
}

export async function getAlbumInfo(
    artist: string,
    album: string,
): Promise<{
    name: string;
    artist: string;
    url: string;
    mbid: string | null;
    imageUrl: string | null;
} | null> {
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
}
