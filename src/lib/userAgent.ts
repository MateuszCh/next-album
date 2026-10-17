// One identifiable User-Agent for every upstream (Last.fm, Discogs, Cover Art
// Archive): app name, version and a contact URL, in the MusicBrainz-style format
// `Name/version ( contact )`. All three ask for an app-identifying agent.

export function getUserAgent(): string {
    const appUrl = process.env.APP_URL;
    if (!appUrl) {
        throw new Error('APP_URL is not set (add it to .env.local).');
    }
    return `next-album/1.0 ( ${appUrl} )`;
}

// Upper bound for a single upstream request. A hung connection would otherwise
// hold a rate-limiter queue — and with it every user's rolls — forever.
export const UPSTREAM_TIMEOUT_MS = 10_000;
