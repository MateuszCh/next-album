'use client';

import { useI18n } from '@/components/LanguageProvider';
import { useTheme } from '@/components/ThemeProvider';
import { ExternalIcon, StarIcon } from '@/components/Icons';
import type { AlbumRecommendation } from '@/lib/lastfm/types';

const searchUrl = (artist: string, album: string, service: 'spotify' | 'ytm') => {
    const q = encodeURIComponent(`${artist} ${album}`);
    return service === 'spotify'
        ? `https://open.spotify.com/search/${q}`
        : `https://music.youtube.com/search?q=${q}`;
};

/**
 * Where to listen: link chips (pills, outlined tags or plain text, per skin).
 * Where the skin keeps no save beside the Next button, Save leads the row:
 * Tuner as a row of four keys, Rave as an outlined pink chip.
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
    const withSave = tuner || skin === 'rave';
    const short = tuner || skin === 'rave' || skin === 'guma';

    const links = [
        { href: searchUrl(album.artist, album.name, 'spotify'), label: 'Spotify' },
        {
            href: searchUrl(album.artist, album.name, 'ytm'),
            label: short ? 'YT Music' : 'YouTube Music',
        },
        { href: album.url, label: album.source === 'discogs' ? 'Discogs' : 'Last.fm' },
    ];

    return (
        <nav className={tuner ? 'tun-keys' : 'listen'} aria-label={t('listen.aria')}>
            {withSave && (
                <button
                    type="button"
                    className={tuner ? 'tun-key' : 'listen__save'}
                    onClick={onToggleSave}
                    aria-pressed={saved}
                    aria-label={saved ? t('card.unsave') : t('card.save')}
                >
                    {tuner ? (
                        <span className="led" aria-hidden />
                    ) : (
                        <StarIcon size={16} strokeWidth={2} filled={saved} />
                    )}
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
