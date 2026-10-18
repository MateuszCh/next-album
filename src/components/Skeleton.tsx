'use client';

import { useI18n } from '@/components/LanguageProvider';
import { useTheme } from '@/components/ThemeProvider';
import type { AppMode } from '@/components/AppDataProvider';

/**
 * Placeholders shown while the user's data (last album, history, saved) loads.
 * They reuse the real layouts' classes, with a bar inside each text element, so
 * nothing jumps when the content arrives. They fade in after a short delay, so
 * a fast load never flashes them.
 */

/** A shimmering bar standing in for one line of text, `width` of its line. */
function Bar({ width }: { width: string }) {
    return <span className="skel" style={{ width }} />;
}

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
                    <div className="sk-album__heading">
                        <p className="sk-album__title">
                            <Bar width="85%" />
                        </p>
                        <p className="sk-album__meta">
                            <Bar width="55%" />
                        </p>
                    </div>
                </div>
                <p className="sk-album__reason">
                    <Bar width="90%" />
                    <br />
                    <Bar width="50%" />
                </p>
            </article>
        );
    }

    return (
        <article className="sk-album--cover skel-wrap" aria-busy="true" aria-label={t('loading')}>
            <div className="sk-album__art">
                <div className="cover-loader" />
            </div>
            <div className="sk-album__body">
                <p className="sk-album__title">
                    <Bar width="70%" />
                </p>
                <p className="sk-album__meta">
                    <Bar width="40%" />
                </p>
                <p className="sk-album__reason">
                    <Bar width="90%" />
                    <br />
                    <Bar width="55%" />
                </p>
            </div>
        </article>
    );
}

/** Losuj: where the listen links (Okładka) or the Save + links keys (Tuner) will be. */
export function LinksSkeleton() {
    const { skin } = useTheme();

    if (skin === 'tuner') {
        return (
            <div className="tun-keys skel-wrap" aria-hidden>
                {[0, 1, 2, 3].map((i) => (
                    <span key={i} className="tun-key">
                        <Bar width="60%" />
                    </span>
                ))}
            </div>
        );
    }

    return (
        <div className="listen skel-wrap" aria-hidden>
            {[0, 1, 2].map((i) => (
                <span key={i} className="skel skel--pill" />
            ))}
        </div>
    );
}

/** Historia: a few list rows (with the save key beside each). */
export function RowsSkeleton() {
    const { t } = useI18n();
    return (
        <ul className="rows skel-wrap" aria-busy="true" aria-label={t('loading')}>
            {[0, 1, 2, 3, 4].map((i) => (
                <li key={i} className="row">
                    <div className="row__pick">
                        <span className="row__cover">
                            <span className="cover-loader" />
                        </span>
                        <span className="row__meta">
                            <span className="row__name">
                                <Bar width="70%" />
                            </span>
                            <span className="row__sub">
                                <Bar width="45%" />
                            </span>
                        </span>
                    </div>
                    <span className="row__action" />
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
                        <span className="tile__meta">
                            <span className="tile__name">
                                <Bar width="75%" />
                            </span>
                            <span className="tile__sub">
                                <Bar width="50%" />
                            </span>
                        </span>
                    </div>
                </li>
            ))}
        </ul>
    );
}
