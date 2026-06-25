// Shared Last.fm response types (only the fields we use).

import type { AlbumReason } from '@/lib/i18n';

export interface LastfmImage {
    '#text': string;
    size: 'small' | 'medium' | 'large' | 'extralarge' | 'mega' | '';
}

export interface LastfmTopAlbum {
    name: string;
    playcount: string;
    mbid?: string;
    url: string;
    artist: { name: string; mbid?: string; url: string };
    image: LastfmImage[];
}

export interface LastfmTopArtist {
    name: string;
    playcount: string;
    mbid?: string;
    url: string;
    image: LastfmImage[];
}

export interface LastfmSimilarArtist {
    name: string;
    mbid?: string;
    match: string; // "0.0".."1.0"
    url: string;
    image: LastfmImage[];
}

export interface LastfmArtistAlbum {
    name: string;
    playcount?: number;
    mbid?: string;
    url: string;
    artist: { name: string; mbid?: string; url: string };
    image: LastfmImage[];
}

export interface LastfmTagAlbum {
    name: string;
    mbid?: string;
    url: string;
    artist: { name: string; mbid?: string; url: string };
    image: LastfmImage[];
}

export interface LastfmTagArtist {
    name: string;
    mbid?: string;
    url: string;
    image: LastfmImage[];
}

export interface LastfmRecentTrack {
    name: string;
    artist: { '#text': string; mbid?: string };
    album: { '#text': string; mbid?: string };
}

// Normalized album returned by the recommendation engine to the front-end.
export interface AlbumRecommendation {
    name: string;
    artist: string;
    url: string;
    imageUrl: string | null;
    mode: 'rediscovery' | 'discovery';
    // Structured so the client can localize it; string accepted for legacy cache.
    reason: AlbumReason | string;
    playcount: number | null;
    genre?: string;
}
