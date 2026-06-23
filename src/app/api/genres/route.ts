import { NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session';
import { cached } from '@/lib/cache';
import { loadProfile } from '@/lib/recommend/engine';
import { getTagTopArtists } from '@/lib/lastfm/tag';
import { GENRES } from '@/lib/recommend/genres';

const FOR_YOU_TTL_MS = 60 * 60 * 1000; // 1h, matches the profile cache

export async function GET() {
    const session = await getSessionFromCookies();
    if (!session.username) {
        return NextResponse.json({ error: 'Not logged in.' }, { status: 401 });
    }
    const username = session.username;

    try {
        const genres = await cached(
            `genresForYou:${username}`,
            async () => {
                const profile = await loadProfile(username);
                // Mark a genre "for you" when any of the user's top artists is
                // among that genre's top artists. These tag lookups are cached
                // globally and reused by genre-favorites recommendations.
                return Promise.all(
                    GENRES.map(async (g) => {
                        let forYou = false;
                        try {
                            const artists = await getTagTopArtists(g.tag);
                            forYou = artists.some((a) =>
                                profile.topArtistNames.has(a.name.toLowerCase()),
                            );
                        } catch {
                            // leave forYou false on lookup failure
                        }
                        return { tag: g.tag, label: g.label, forYou };
                    }),
                );
            },
            FOR_YOU_TTL_MS,
        );

        return NextResponse.json({ genres });
    } catch (err) {
        console.error('genres failed:', err);
        return NextResponse.json({ error: 'Could not load genres.' }, { status: 502 });
    }
}
