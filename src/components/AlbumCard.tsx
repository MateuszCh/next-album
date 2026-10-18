'use client';

import { useEffect, useState } from 'react';
import { upgradeLastfmImage } from '@/lib/coverUrl';
import { formatReason } from '@/lib/i18n';
import { useI18n } from '@/components/LanguageProvider';
import { useTheme } from '@/components/ThemeProvider';
import { SparkleIcon, Stripes } from '@/components/Icons';
import { albumLayout } from '@/lib/skin';
import type { AppMode } from '@/components/AppDataProvider';
import type { AlbumRecommendation } from '@/lib/lastfm/types';

export const MODE_BADGE: Record<AlbumRecommendation['mode'], string> = {
    discovery: 'card.discovery',
    rediscovery: 'card.favorites',
    search: 'card.search',
};

/**
 * Show the fast native cover immediately, then swap to the sharp 600x600 variant
 * once it has loaded in the background (its cold CDN transform can take a few
 * seconds, but it no longer blocks showing the album).
 */
function useCover(imageUrl: string | null) {
    const [src, setSrc] = useState(imageUrl);
    // Whether the visible cover has finished loading. Stays true once the first
    // (low-res) image loads, so the later hi-res swap doesn't re-flash the loader.
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        setSrc(imageUrl);
        if (!imageUrl) return;
        const hiRes = upgradeLastfmImage(imageUrl);
        if (hiRes === imageUrl) return;
        // Cancel the preload on album change so a slow, stale hi-res load can't
        // overwrite the current album's cover (its CDN transform can take a few
        // seconds, easily outliving a rapid sequence of "next album" clicks).
        let cancelled = false;
        const preload = new window.Image();
        preload.onload = () => {
            if (!cancelled) setSrc(hiRes);
        };
        preload.src = hiRes;
        return () => {
            cancelled = true;
            preload.onload = null;
        };
    }, [imageUrl]);

    return { src, loaded, onDone: () => setLoaded(true) };
}

/**
 * The picked album — the element that makes each skin recognisable. Two
 * layouts (`albumLayout`): a full-width cover with the text under it (Okładka,
 * Rave, Ambient, Guma) or a panel with the cover beside the title (Tuner's LCD,
 * Kaseta's cassette card). The badge sits beside the art, not inside it, so a
 * skin can place it outside the cover (Ambient's pill, Guma's sticker).
 */
export function AlbumCard({ album, appMode }: { album: AlbumRecommendation; appMode: AppMode }) {
    const { t } = useI18n();
    const { skin } = useTheme();
    const { src, loaded, onDone } = useCover(album.imageUrl);

    const art = src ? (
        <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={src}
                alt={t('card.coverAlt', { name: album.name })}
                onLoad={onDone}
                onError={onDone}
            />
            {!loaded && <div className="cover-loader" aria-hidden />}
        </>
    ) : (
        <span className="sk-album__placeholder" aria-hidden>
            ♪
        </span>
    );
    const meta = `${album.artist}${album.year ? ` · ${album.year}` : ''}`;
    const reason = formatReason(t, album.reason);

    const badge = t(MODE_BADGE[album.mode]);

    if (albumLayout(skin) === 'display') {
        return (
            <article className="sk-album--display" aria-label={t('lcd.aria')}>
                {skin === 'tuner' && (
                    <div className="sk-album__status">
                        <span>{t('lcd.mode', { mode: t(`mode.${appMode}`) })}</span>
                        <span>● {badge}</span>
                    </div>
                )}
                <div className="sk-album__row">
                    <div className="sk-album__art">{art}</div>
                    <div className="sk-album__heading">
                        {skin === 'kaseta' && <Stripes className="sk-album__stripes" />}
                        <h2 className="sk-album__title">{album.name}</h2>
                        <p className="sk-album__meta">{meta}</p>
                        {skin === 'kaseta' && <span className="sk-album__tag">{badge}</span>}
                    </div>
                </div>
                <p className="sk-album__reason">{reason}</p>
            </article>
        );
    }

    return (
        <article className="sk-album--cover">
            <div className="sk-album__frame">
                <div className="sk-album__art">{art}</div>
                <span className="sk-album__badge">
                    <span>{badge}</span>
                </span>
                {skin === 'guma' && <GumaSparkles />}
            </div>
            <div className="sk-album__body">
                <h2 className="sk-album__title">{album.name}</h2>
                <p className="sk-album__meta">{meta}</p>
                <p className="sk-album__reason">{reason}</p>
            </div>
        </article>
    );
}

/** Guma: two sparkles beside the cover. */
function GumaSparkles() {
    return (
        <>
            <SparkleIcon size={30} className="sk-album__spark sk-album__spark--big" />
            <SparkleIcon size={18} className="sk-album__spark sk-album__spark--small" />
        </>
    );
}

/** The album slot before anything is picked (or while a login is needed). */
export function AlbumEmpty({
    appMode,
    title,
    text,
    hint,
}: {
    appMode: AppMode;
    title: string;
    text: string;
    /** Display layout (Tuner, Kaseta): a short line under the title. */
    hint?: string;
}) {
    const { t } = useI18n();
    const { skin } = useTheme();

    if (albumLayout(skin) === 'display') {
        return (
            <article className="sk-album--display sk-album--empty" aria-label={t('lcd.aria')}>
                {skin === 'tuner' && (
                    <div className="sk-album__status">
                        <span>{t('lcd.mode', { mode: t(`mode.${appMode}`) })}</span>
                        <span>○ {t('lcd.noSignal')}</span>
                    </div>
                )}
                <div className="sk-album__row">
                    <div className="sk-album__art sk-album__art--empty" aria-hidden>
                        – – –
                    </div>
                    <div className="sk-album__heading">
                        {skin === 'kaseta' && <Stripes className="sk-album__stripes" />}
                        <h1 className="sk-album__title">{title}</h1>
                        {hint && <p className="sk-album__meta">{hint}</p>}
                    </div>
                </div>
                <p className="sk-album__reason">{text}</p>
            </article>
        );
    }

    return (
        <article className="sk-album--cover sk-album--empty">
            <div className="sk-album__frame">
                <div className="sk-album__art">
                    <span className="sk-album__rings" aria-hidden>
                        <span />
                        <span />
                    </span>
                    <span className="sk-album__empty-note">{t('draw.empty')}</span>
                </div>
                {skin === 'guma' && <GumaSparkles />}
            </div>
            <div className="sk-album__body">
                <h1 className="sk-album__title">{title}</h1>
                <p className="sk-album__reason">{text}</p>
            </div>
        </article>
    );
}
