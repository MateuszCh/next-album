// Album cover art resolution.
// Last.fm very often returns a placeholder ("star") instead of a cover — we
// detect it by known hashes and try a fallback to the Cover Art Archive (by
// release mbid) when an mbid is available.

import { persistentCached } from '@/lib/persistentCache';
import { getUserAgent } from '@/lib/userAgent';

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

// Covers rarely change; the result (including "no cover") is cached for a week
// (memory + Mongo).
const CAA_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CAA_TIMEOUT_MS = 5000;

/**
 * Checks whether the Cover Art Archive has a front cover for the given release
 * mbid. Returns the cover URL or null.
 *
 * Last.fm mbids are release ids (not release-groups), so only `/release/` is
 * tried. `front-500` is a 500px thumbnail; plain `/front` would be the original
 * upload, often several MB. CAA answers an existing cover with a 307 to
 * archive.org and a missing one with 404, so the redirect isn't followed — the
 * browser does that when it loads the image.
 */
function coverArtArchiveUrl(mbid: string): Promise<string | null> {
    // Only a definite answer is cached: network errors, timeouts and 503s throw
    // out of the loader (not cached) and count as "no cover" for this roll only.
    return persistentCached(
        `caa:${mbid}`,
        async () => {
            const url = `https://coverartarchive.org/release/${mbid}/front-500`;
            const res = await fetch(url, {
                method: 'HEAD',
                redirect: 'manual',
                cache: 'no-store',
                headers: { 'User-Agent': getUserAgent() },
                signal: AbortSignal.timeout(CAA_TIMEOUT_MS),
            });
            if (res.ok || (res.status >= 300 && res.status < 400)) return url;
            // 404: no such release or no front cover; 400: not a valid mbid.
            if (res.status === 404 || res.status === 400) return null;
            throw new Error(`Cover Art Archive HTTP ${res.status}`);
        },
        CAA_TTL_MS,
    ).catch(() => null);
}

/**
 * Returns the best available cover: the Last.fm image if it isn't a placeholder;
 * otherwise a Cover Art Archive fallback by mbid.
 *
 * The Last.fm image is returned at the size Last.fm natively serves (typically
 * 300x300), which the Fastly CDN keeps warm everywhere, so it loads in ~100ms.
 * The bigger 600x600 transform is rendered on demand and is cold for most
 * albums (3s+ on a cache miss), so we don't force it here — the client upgrades
 * to the sharp variant progressively via `upgradeLastfmImage` (`coverUrl.ts`)
 * once it loads.
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
