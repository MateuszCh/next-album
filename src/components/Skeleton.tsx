'use client';

import { useI18n } from '@/components/LanguageProvider';
import { useTheme } from '@/components/ThemeProvider';
import type { AppMode } from '@/components/AppDataProvider';

/**
 * Placeholders shown while the user's data (last album, history, saved) loads.
 * They mirror the real layouts so nothing jumps when the content arrives, and
 * fade in after a short delay so a fast load never flashes them.
 */

/** The album slot: a shimmering cover (Okładka) or an LCD that is still tuning (Tuner). */
export function AlbumSkeleton({ appMode }: { appMode: AppMode }) {
    const { t } = useI18n();
    const { skin } = useTheme();

    if (skin === 'tuner') {
        return (
            <article
                className="sk-album--display skel-wrap"
                aria-busy="true"
                aria-label={t('loading')}
            >
                <div className="sk-album__status">
                    <span>{t('lcd.mode', { mode: t(`mode.${appMode}`) })}</span>
                    <span className="skel-tuning">◌ {t('lcd.tuning')}</span>
                </div>
                <div className="sk-album__row">
                    <div className="sk-album__art">
                        <div className="cover-loader" />
                    </div>
                    <div className="sk-album__heading skel-lines">
                        <span className="skel skel--lcd skel--title" />
                        <span className="skel skel--lcd skel--short" />
                    </div>
                </div>
                <div className="sk-album__reason skel-lines">
                    <span className="skel skel--lcd skel--text" />
                </div>
            </article>
        );
    }

    return (
        <article className="sk-album--cover skel-wrap" aria-busy="true" aria-label={t('loading')}>
            <div className="sk-album__art">
                <div className="cover-loader" />
            </div>
            <div className="sk-album__body skel-lines">
                <span className="skel skel--title" />
                <span className="skel skel--short" />
                <span className="skel skel--text" />
            </div>
        </article>
    );
}

/** Historia: a few list rows. */
export function RowsSkeleton() {
    const { t } = useI18n();
    return (
        <ul className="rows skel-wrap" aria-busy="true" aria-label={t('loading')}>
            {[0, 1, 2, 3, 4].map((i) => (
                <li key={i} className="row">
                    <div className="row__pick row__pick--skel">
                        <span className="row__cover">
                            <span className="cover-loader" />
                        </span>
                        <span className="row__meta skel-lines">
                            <span className="skel skel--name" />
                            <span className="skel skel--sub" />
                        </span>
                    </div>
                </li>
            ))}
        </ul>
    );
}

/** Ulubione: a few cover tiles. */
export function TilesSkeleton() {
    const { t } = useI18n();
    return (
        <ul className="tiles skel-wrap" aria-busy="true" aria-label={t('loading')}>
            {[0, 1, 2, 3].map((i) => (
                <li key={i} className="tile">
                    <div className="tile__open">
                        <span className="tile__art">
                            <span className="cover-loader" />
                        </span>
                        <span className="tile__meta skel-lines">
                            <span className="skel skel--name" />
                            <span className="skel skel--sub" />
                        </span>
                    </div>
                </li>
            ))}
        </ul>
    );
}
