// Curated list of genres offered in "By genre" mode. `tag` is the exact Last.fm
// tag used for tag.getTopAlbums / tag.getTopArtists; `label` is what the UI
// shows. Keeping a fixed list (rather than Last.fm's noisy top tags) gives a
// clean, predictable picker; personalization just highlights entries from it.

export interface Genre {
    tag: string;
    label: string;
}

export const GENRES: Genre[] = [
    { tag: 'rock', label: 'Rock' },
    { tag: 'pop', label: 'Pop' },
    { tag: 'hip-hop', label: 'Hip-Hop' },
    { tag: 'electronic', label: 'Electronic' },
    { tag: 'indie', label: 'Indie' },
    { tag: 'metal', label: 'Metal' },
    { tag: 'jazz', label: 'Jazz' },
    { tag: 'classical', label: 'Classical' },
    { tag: 'rnb', label: 'R&B' },
    { tag: 'punk', label: 'Punk' },
    { tag: 'folk', label: 'Folk' },
    { tag: 'soul', label: 'Soul' },
    { tag: 'ambient', label: 'Ambient' },
    { tag: 'house', label: 'House' },
    { tag: 'techno', label: 'Techno' },
    { tag: 'country', label: 'Country' },
    { tag: 'blues', label: 'Blues' },
    { tag: 'reggae', label: 'Reggae' },
];

const GENRE_BY_TAG = new Map(GENRES.map((g) => [g.tag.toLowerCase(), g]));

/** Whether a tag is one of the curated genres (server-side input validation). */
export function isKnownGenre(tag: string): boolean {
    return GENRE_BY_TAG.has(tag.toLowerCase());
}

/** Look up a curated genre by its tag, or undefined if not known. */
export function getGenre(tag: string): Genre | undefined {
    return GENRE_BY_TAG.get(tag.toLowerCase());
}
