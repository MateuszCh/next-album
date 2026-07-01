'use client';

import { useEffect, useState } from 'react';
import { upgradeLastfmImage } from '@/lib/coverart';
import { formatReason } from '@/lib/i18n';
import { useI18n } from '@/components/LanguageProvider';
import type { AlbumRecommendation } from '@/lib/lastfm/types';

const searchUrl = (artist: string, album: string, service: 'spotify' | 'ytm') => {
    const q = encodeURIComponent(`${artist} ${album}`);
    return service === 'spotify'
        ? `https://open.spotify.com/search/${q}`
        : `https://music.youtube.com/search?q=${q}`;
};

export function AlbumCard({
    album,
    saved,
    onToggleSave,
}: {
    album: AlbumRecommendation;
    // Saved state is owned by the parent (backed by the DB); the card just renders
    // it and reports toggles.
    saved: boolean;
    onToggleSave: () => void;
}) {
    const { t } = useI18n();
    // Show the fast native cover immediately, then swap to the sharp 600x600
    // variant once it has loaded in the background (its cold CDN transform can
    // take a few seconds, but it no longer blocks showing the album).
    const [src, setSrc] = useState(album.imageUrl);

    useEffect(() => {
        setSrc(album.imageUrl);
        if (!album.imageUrl) return;
        const hiRes = upgradeLastfmImage(album.imageUrl);
        if (hiRes === album.imageUrl) return;
        const preload = new window.Image();
        preload.onload = () => setSrc(hiRes);
        preload.src = hiRes;
    }, [album.imageUrl]);

    return (
        <div className="card">
            <div className="card-cover">
                {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt={t('card.coverAlt', { name: album.name })} />
                ) : (
                    <div className="placeholder" aria-hidden>
                        ♪
                    </div>
                )}
                <span className="badge">
                    {album.mode === 'discovery' ? t('card.discovery') : t('card.favorites')}
                </span>
                {album.genre && <span className="badge badge-genre">{album.genre}</span>}
                <button
                    type="button"
                    className={`save-btn${saved ? ' saved' : ''}`}
                    onClick={onToggleSave}
                    aria-pressed={saved}
                    aria-label={saved ? t('card.unsave') : t('card.save')}
                    title={saved ? t('card.unsave') : t('card.save')}
                >
                    <svg viewBox="0 0 24 24" aria-hidden width="20" height="20">
                        <path
                            d="M12 17.3l-5.4 3.2 1.4-6.1-4.7-4.1 6.2-.5L12 4l2.5 5.8 6.2.5-4.7 4.1 1.4 6.1z"
                            fill={saved ? 'currentColor' : 'none'}
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>
            </div>
            <div className="card-body">
                <h2 className="album-title">{album.name}</h2>
                <p className="album-artist">{album.artist}</p>
                <p className="reason">{formatReason(t, album.reason)}</p>
                <div className="card-links">
                    <a className="btn btn-ghost" href={album.url} target="_blank" rel="noreferrer">
                        Last.fm
                    </a>
                    <a
                        className="btn btn-ghost"
                        href={searchUrl(album.artist, album.name, 'spotify')}
                        target="_blank"
                        rel="noreferrer"
                    >
                        Spotify
                    </a>
                    <a
                        className="btn btn-ghost"
                        href={searchUrl(album.artist, album.name, 'ytm')}
                        target="_blank"
                        rel="noreferrer"
                    >
                        YouTube Music
                    </a>
                </div>
            </div>
        </div>
    );
}
