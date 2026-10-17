// Curated list of countries offered in the album search. `tag` is the stable id
// (sent by the client and kept in localStorage); `label` is the English fallback
// (the UI translates via i18n `country.<tag>`); `discogs` is the Discogs country
// name. Note Discogs filters by the country a release was *issued* in, not the
// artist's nationality.

export interface Country {
    tag: string;
    label: string;
    discogs: string;
}

export const COUNTRIES: Country[] = [
    { tag: 'british', label: 'United Kingdom', discogs: 'UK' },
    { tag: 'american', label: 'United States', discogs: 'US' },
    { tag: 'polish', label: 'Poland', discogs: 'Poland' },
    { tag: 'german', label: 'Germany', discogs: 'Germany' },
    { tag: 'french', label: 'France', discogs: 'France' },
    { tag: 'japanese', label: 'Japan', discogs: 'Japan' },
    { tag: 'brazilian', label: 'Brazil', discogs: 'Brazil' },
    { tag: 'italian', label: 'Italy', discogs: 'Italy' },
    { tag: 'spanish', label: 'Spain', discogs: 'Spain' },
];

const COUNTRY_BY_TAG = new Map(COUNTRIES.map((c) => [c.tag.toLowerCase(), c]));

/** Whether a tag is one of the curated countries (server-side input validation). */
export function isKnownCountry(tag: string): boolean {
    return COUNTRY_BY_TAG.has(tag.toLowerCase());
}

/** Look up a curated country by its tag, or undefined if not known. */
export function getCountry(tag: string): Country | undefined {
    return COUNTRY_BY_TAG.get(tag.toLowerCase());
}
