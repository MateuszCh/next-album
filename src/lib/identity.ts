// Identity keys for albums and artists, shared by the server (engine, user data
// dedup) and the client (saved state). Last.fm lists the same album under several
// entries ("The Division Bell" / "The Division Bell (2011 Remastered Version)",
// "Naprawdę nie dzieje się nic" / "Naprawde Nie Dzieje Sie Nic"), so keys are
// compared after folding case, diacritics, punctuation and edition suffixes.
// Keys are for comparison only — never shown.

import type { AlbumRecommendation } from '@/lib/lastfm/types';

// Letters NFKD doesn't decompose into a base letter + combining mark.
const EXTRA_FOLDS: Record<string, string> = {
    ł: 'l',
    ø: 'o',
    đ: 'd',
    ß: 'ss',
    æ: 'ae',
    œ: 'oe',
    ı: 'i',
};

function fold(s: string): string {
    return s
        .toLowerCase()
        .normalize('NFKD')
        .replace(/\p{M}/gu, '')
        .replace(/[łøđßæœı]/g, (c) => EXTRA_FOLDS[c]);
}

/** Folded, with every run of non-alphanumerics collapsed to one space. */
function collapse(s: string): string {
    return s.replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

const EDITION_WORDS =
    'deluxe|remaster(?:ed)?|edition|expanded|anniversary|bonus|version|mono|stereo|reissue|legacy';

// "(2011 Remastered Version)", "[Deluxe Edition]"
const EDITION_BRACKETS = new RegExp(`[([][^)\\]]*\\b(?:${EDITION_WORDS})\\b[^)\\]]*[)\\]]`, 'g');
// "Abbey Road - 2019 Remaster"
const EDITION_SUFFIX = new RegExp(`\\s[-–—]\\s[^-–—]*\\b(?:${EDITION_WORDS})\\b.*$`);

function titleKey(title: string): string {
    const folded = fold(title);
    const stripped = folded.replace(EDITION_BRACKETS, ' ').replace(EDITION_SUFFIX, '');
    // Never strip a title down to nothing (e.g. an album called "(Deluxe)").
    return collapse(stripped) || collapse(folded);
}

export function artistKey(name: string): string {
    return collapse(fold(name)).replace(/^the /, '');
}

// Collaboration separators: "Frank Sinatra & Count Basie", "A feat. B", "A x B".
const COLLAB_SEPARATOR =
    /\s*(?:&|\+|\band\b|\bfeat\b\.?|\bft\b\.?|\bfeaturing\b|\bvs\b\.?|\bx\b)\s*/;

/**
 * The artist's key plus the keys of its parts when the name is a collaboration,
 * so "Frank Sinatra & Count Basie" can be matched against "Frank Sinatra".
 */
export function artistKeys(name: string): string[] {
    const parts = fold(name)
        .split(COLLAB_SEPARATOR)
        .map((p) => artistKey(p))
        .filter(Boolean);
    const full = artistKey(name);
    return parts.length > 1 ? [full, ...parts] : [full];
}

export function albumKey(artist: string, title: string): string {
    return `${artistKey(artist)}::${titleKey(title)}`;
}

export function recommendationKey(album: AlbumRecommendation): string {
    return albumKey(album.artist, album.name);
}
