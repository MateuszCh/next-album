// Curated list of decades offered in "By decade" mode. `tag` is the exact
// Last.fm tag used for tag.getTopAlbums / tag.getTopArtists; `label` is what the
// UI shows. Decades are just another "tag dimension" — the same machinery as
// genres (genres.ts), so picking one runs the genre recommendation pipeline.

export interface Decade {
    tag: string;
    label: string;
}

export const DECADES: Decade[] = [
    { tag: '60s', label: "60s" },
    { tag: '70s', label: "70s" },
    { tag: '80s', label: "80s" },
    { tag: '90s', label: "90s" },
    { tag: '2000s', label: "2000s" },
    { tag: '2010s', label: "2010s" },
];

const DECADE_BY_TAG = new Map(DECADES.map((d) => [d.tag.toLowerCase(), d]));

/** Whether a tag is one of the curated decades (server-side input validation). */
export function isKnownDecade(tag: string): boolean {
    return DECADE_BY_TAG.has(tag.toLowerCase());
}

/** Look up a curated decade by its tag, or undefined if not known. */
export function getDecade(tag: string): Decade | undefined {
    return DECADE_BY_TAG.get(tag.toLowerCase());
}
