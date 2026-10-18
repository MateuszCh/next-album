'use client';

import { useI18n } from '@/components/LanguageProvider';
import { useTheme } from '@/components/ThemeProvider';
import { ExternalIcon } from '@/components/Icons';
import type { AlbumRecommendation } from '@/lib/lastfm/types';

const searchUrl = (artist: string, album: string, service: 'spotify' | 'ytm') => {
    const q = encodeURIComponent(`${artist} ${album}`);
    return service === 'spotify'
        ? `https://open.spotify.com/search/${q}`
        : `https://music.youtube.com/search?q=${q}`;
};

/**
 * Where to listen: pill links in Okładka; in Tuner a row of four keys — Save
 * plus the three links (save sits beside the play button in Okładka).
 */
export function ListenLinks({
    album,
    saved,
    onToggleSave,
}: {
    album: AlbumRecommendation;
    saved: boolean;
    onToggleSave: () => void;
}) {
    const { t } = useI18n();
    const { skin } = useTheme();
    const tuner = skin === 'tuner';

    const links = [
        { href: searchUrl(album.artist, album.name, 'spotify'), label: 'Spotify' },
        {
            href: searchUrl(album.artist, album.name, 'ytm'),
            label: tuner ? 'YT Music' : 'YouTube Music',
        },
        { href: album.url, label: album.source === 'discogs' ? 'Discogs' : 'Last.fm' },
    ];

    return (
        <nav className={tuner ? 'tun-keys' : 'listen'} aria-label={t('listen.aria')}>
            {tuner && (
                <button
                    type="button"
                    className="tun-key"
                    onClick={onToggleSave}
                    aria-pressed={saved}
                    aria-label={saved ? t('card.unsave') : t('card.save')}
                >
                    <span className="led" aria-hidden />
                    {saved ? t('key.saved') : t('key.save')}
                </button>
            )}
            {links.map((l) => (
                <a
                    key={l.label}
                    className={tuner ? 'tun-key' : 'listen__link'}
                    href={l.href}
                    target="_blank"
                    rel="noreferrer"
                >
                    {l.label}
                    {!tuner && <ExternalIcon />}
                </a>
            ))}
        </nav>
    );
}
