// Curated list of genres offered in the album search. `tag` is the stable id
// (sent by the client and kept in localStorage); `label` is what the UI shows.
// `discogs` lists the Discogs genre/style queries the genre maps to — Discogs
// search takes one genre and one style per query, so a roll picks one variant
// at random (e.g. metal → Heavy Metal / Thrash / Death Metal / …).

export interface DiscogsGenreQuery {
    genre?: string;
    style?: string;
}

export interface Genre {
    tag: string;
    label: string;
    discogs: DiscogsGenreQuery[];
}

export const GENRES: Genre[] = [
    { tag: 'rock', label: 'Rock', discogs: [{ genre: 'Rock' }] },
    { tag: 'pop', label: 'Pop', discogs: [{ genre: 'Pop' }] },
    { tag: 'hip-hop', label: 'Rap', discogs: [{ genre: 'Hip Hop' }] },
    { tag: 'electronic', label: 'Electronic', discogs: [{ genre: 'Electronic' }] },
    { tag: 'indie', label: 'Indie', discogs: [{ style: 'Indie Rock' }, { style: 'Indie Pop' }] },
    {
        tag: 'metal',
        label: 'Metal',
        discogs: [
            { style: 'Heavy Metal' },
            { style: 'Thrash' },
            { style: 'Death Metal' },
            { style: 'Black Metal' },
            { style: 'Doom Metal' },
        ],
    },
    { tag: 'jazz', label: 'Jazz', discogs: [{ genre: 'Jazz' }] },
    { tag: 'classical', label: 'Classical', discogs: [{ genre: 'Classical' }] },
    {
        tag: 'rnb',
        label: 'R&B',
        discogs: [{ style: 'Rhythm & Blues' }, { style: 'Contemporary R&B' }],
    },
    { tag: 'punk', label: 'Punk', discogs: [{ style: 'Punk' }] },
    { tag: 'folk', label: 'Folk', discogs: [{ genre: 'Folk, World, & Country' }] },
    { tag: 'soul', label: 'Soul', discogs: [{ genre: 'Funk / Soul' }] },
    { tag: 'ambient', label: 'Ambient', discogs: [{ style: 'Ambient' }] },
    { tag: 'house', label: 'House', discogs: [{ style: 'House' }] },
    { tag: 'techno', label: 'Techno', discogs: [{ style: 'Techno' }] },
    { tag: 'country', label: 'Country', discogs: [{ style: 'Country' }] },
    { tag: 'blues', label: 'Blues', discogs: [{ genre: 'Blues' }] },
    { tag: 'reggae', label: 'Reggae', discogs: [{ genre: 'Reggae' }] },
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
