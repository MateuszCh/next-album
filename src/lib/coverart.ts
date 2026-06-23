// Album cover art resolution.
// Last.fm very often returns a placeholder ("star") instead of a cover — we
// detect it by known hashes and try a fallback to the Cover Art Archive (by
// release mbid) when an mbid is available.

// Known Last.fm placeholder hashes (the star image).
const LASTFM_PLACEHOLDER_HASHES = [
    '2a96cbd8b46e442fc41c2b86b821562f', // album/track star
    'c6f59c1e5e7240a4c0d427abd71f3dbb', // alt
    '4128a6eb29f94943c9d206c08e625904', // artist star
];

export function isPlaceholderImage(url: string | null | undefined): boolean {
    if (!url) return true;
    return LASTFM_PLACEHOLDER_HASHES.some((h) => url.includes(h));
}

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

/**
 * Checks whether the Cover Art Archive has a front cover for the given mbid.
 * Returns the cover URL or null.
 */
async function coverArtArchiveUrl(mbid: string): Promise<string | null> {
    // CAA supports both release and release-group; try both.
    const candidates = [
        `https://coverartarchive.org/release-group/${mbid}/front`,
        `https://coverartarchive.org/release/${mbid}/front`,
    ];
    for (const url of candidates) {
        try {
            const res = await fetch(url, {
                method: 'HEAD',
                redirect: 'follow',
                cache: 'no-store',
            });
            if (res.ok) return url;
        } catch {
            // ignore and try the next one
        }
    }
    return null;
}

/**
 * Returns the best available cover: the Last.fm image if it isn't a placeholder;
 * otherwise a Cover Art Archive fallback by mbid.
 *
 * The Last.fm image is returned at the size Last.fm natively serves (typically
 * 300x300), which the Fastly CDN keeps warm everywhere, so it loads in ~100ms.
 * The bigger 600x600 transform is rendered on demand and is cold for most
 * albums (3s+ on a cache miss), so we don't force it here — the client upgrades
 * to the sharp variant progressively via `upgradeLastfmImage` once it loads.
 */
export async function resolveCover(
    lastfmImage: string | null,
    mbid: string | null,
): Promise<string | null> {
    const usableLastfm = lastfmImage && !isPlaceholderImage(lastfmImage) ? lastfmImage : null;

    if (usableLastfm) return usableLastfm;
    if (mbid) {
        const caa = await coverArtArchiveUrl(mbid);
        if (caa) return caa;
    }
    // if Last.fm gave a placeholder and CAA has nothing — return null (UI shows a placeholder)
    return null;
}
