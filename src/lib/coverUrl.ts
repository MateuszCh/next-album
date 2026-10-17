// Client-safe cover URL helpers — no server imports, so client components can use
// them without pulling in the server-side resolution in `coverart.ts`.

const LASTFM_CDN = 'lastfm.freetls.fastly.net';

// Last.fm serves covers at 300x300 by default, but the CDN can re-render any
// transform size. 600x600 is a sharp default for the card without pulling the
// multi-MB original. Use "" to fetch the full-resolution original instead.
const LASTFM_TARGET_SIZE = '600x600';

/**
 * Last.fm CDN URLs look like `.../i/u/<size>/<hash>.<ext>`. We rewrite the
 * transform size (handling URLs with no size or several transform segments) to
 * a larger one, or drop it entirely for the original when target is "".
 */
export function upgradeLastfmImage(url: string): string {
    if (!url.includes(LASTFM_CDN)) return url;
    const sizeSegment = LASTFM_TARGET_SIZE ? `${LASTFM_TARGET_SIZE}/` : '';
    return url.replace(
        /\/i\/u\/(?:.+\/)?([0-9a-f]+\.(?:png|jpe?g|gif|webp))(\?.*)?$/i,
        `/i/u/${sizeSegment}$1$2`,
    );
}
