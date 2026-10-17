// Curated list of decades offered in the album search. `tag` is the stable id
// (sent by the client and kept in localStorage); `label` is what the UI shows;
// `from` is the first year — the search queries Discogs for `from`..`from + 9`.

export interface Decade {
    tag: string;
    label: string;
    from: number;
}

export const DECADES: Decade[] = [
    { tag: '30s', label: '30s', from: 1930 },
    { tag: '40s', label: '40s', from: 1940 },
    { tag: '50s', label: '50s', from: 1950 },
    { tag: '60s', label: '60s', from: 1960 },
    { tag: '70s', label: '70s', from: 1970 },
    { tag: '80s', label: '80s', from: 1980 },
    { tag: '90s', label: '90s', from: 1990 },
    { tag: '2000s', label: '2000s', from: 2000 },
    { tag: '2010s', label: '2010s', from: 2010 },
    { tag: '2020s', label: '2020s', from: 2020 },
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
