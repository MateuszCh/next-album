// Curated list of moods offered in "By mood" mode. `tag` is the exact Last.fm
// tag used for tag.getTopAlbums / tag.getTopArtists; `label` is what the UI
// shows. Moods are just another "tag dimension" — the same machinery as genres
// (genres.ts), so picking one runs the genre recommendation pipeline.

export interface Mood {
    tag: string;
    label: string;
}

export const MOODS: Mood[] = [
    { tag: 'chillout', label: 'Chill' },
    { tag: 'energetic', label: 'Energetic' },
    { tag: 'melancholy', label: 'Melancholic' },
    { tag: 'happy', label: 'Happy' },
    { tag: 'party', label: 'Party' },
    { tag: 'romantic', label: 'Romantic' },
    { tag: 'aggressive', label: 'Aggressive' },
    { tag: 'dreamy', label: 'Dreamy' },
];

const MOOD_BY_TAG = new Map(MOODS.map((m) => [m.tag.toLowerCase(), m]));

/** Whether a tag is one of the curated moods (server-side input validation). */
export function isKnownMood(tag: string): boolean {
    return MOOD_BY_TAG.has(tag.toLowerCase());
}

/** Look up a curated mood by its tag, or undefined if not known. */
export function getMood(tag: string): Mood | undefined {
    return MOOD_BY_TAG.get(tag.toLowerCase());
}
