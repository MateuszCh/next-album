// Client-safe cover URL helpers — no server imports, so client components can use
// them without pulling in the server-side resolution in `coverart.ts`.

// Last.fm's image CDN. It now serves covers from `lastfm-img.freetls.fastly.net`;
// history and saved lists stored earlier still hold `lastfm.freetls.fastly.net`
// URLs, whose cache is cold (a 0.5–2.5s miss where the current host hits).
const LASTFM_CDN = 'lastfm-img.freetls.fastly.net';
const LASTFM_CDN_HOSTS = /^https:\/\/lastfm(?:-img)?\.freetls\.fastly\.net\//;

// Last.fm serves covers at 300x300 by default, but the CDN can re-render any
// transform size. 600x600 is a sharp default for the card without pulling the
// multi-MB original. Use "" to fetch the full-resolution original instead.
const LASTFM_TARGET_SIZE = '600x600';

/** A Last.fm CDN URL moved to the current host; anything else unchanged. */
export function canonicalLastfmImage(url: string): string {
    return url.replace(LASTFM_CDN_HOSTS, `https://${LASTFM_CDN}/`);
}

/**
 * Last.fm CDN URLs look like `.../i/u/<size>/<hash>.<ext>`. We rewrite the
 * transform size (handling URLs with no size or several transform segments) to
 * a larger one, or drop it entirely for the original when target is "".
 *
 * A size the CDN hasn't rendered yet is cold: 1.5s typically, 5s+ for one roll
 * in ten, sometimes a 404 (originals smaller than the target). Only for the big
 * card, loaded behind the native image — never as the only source.
 */
export function upgradeLastfmImage(url: string): string {
    if (!LASTFM_CDN_HOSTS.test(url)) return url;
    const sizeSegment = LASTFM_TARGET_SIZE ? `${LASTFM_TARGET_SIZE}/` : '';
    return canonicalLastfmImage(url).replace(
        /\/i\/u\/(?:.+\/)?([0-9a-f]+\.(?:png|jpe?g|gif|webp))(\?.*)?$/i,
        `/i/u/${sizeSegment}$1$2`,
    );
}
