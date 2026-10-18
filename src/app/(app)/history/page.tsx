'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MODE_BADGE } from '@/components/AlbumCard';
import { AlbumThumb, itemKey } from '@/components/AlbumThumb';
import { useAppData } from '@/components/AppDataProvider';
import { StarIcon } from '@/components/Icons';
import { Segmented } from '@/components/Segmented';
import { RowsSkeleton } from '@/components/Skeleton';
import { useI18n } from '@/components/LanguageProvider';
import { useTheme } from '@/components/ThemeProvider';
import { COUNT_NOUN, countLabel } from '@/lib/i18n';
import { albumKey } from '@/lib/history';

type Filter = 'all' | 'lastfm' | 'search';

const FILTERS: Filter[] = ['all', 'lastfm', 'search'];

/**
 * Historia: every rolled album, filterable by mode; a row re-opens it on Losuj.
 * Rows are numbered (shown in Rave) and Kaseta names the mode as a tape side.
 */
export default function HistoryPage() {
    const { t, lang } = useI18n();
    const { skin } = useTheme();
    const { dataReady, history, saved, showAlbum, toggleSave } = useAppData();
    const router = useRouter();
    const [filter, setFilter] = useState<Filter>('all');

    const list =
        filter === 'all'
            ? history
            : history.filter((a) => (a.mode === 'search') === (filter === 'search'));
    // Lets each row show whether it's already saved.
    const savedKeys = new Set(saved.map(albumKey));

    return (
        <div className="screen">
            <header className="screen-head">
                <h1 className="screen-title">{t('nav.history')}</h1>
                {history.length > 0 && (
                    <span className="screen-count">
                        {countLabel(t, lang, COUNT_NOUN[skin], list.length)}
                    </span>
                )}
            </header>

            {/* While loading, the filter tabs stay and only the rows are placeholders. */}
            {dataReady && history.length === 0 ? (
                <p className="screen-empty">{t('history.empty')}</p>
            ) : (
                <>
                    <Segmented
                        kind="tabs"
                        label={t('history.filter.aria')}
                        options={FILTERS.map((f) => ({
                            value: f,
                            label: t(`history.filter.${f}`),
                        }))}
                        value={filter}
                        onChange={setFilter}
                        panelIdPrefix="history"
                        className="seg--history"
                    />
                    <div
                        role="tabpanel"
                        id={`history-${filter}`}
                        aria-labelledby={`history-tab-${filter}`}
                    >
                        {!dataReady ? (
                            <RowsSkeleton />
                        ) : list.length === 0 ? (
                            <p className="screen-empty">{t('history.emptyFilter')}</p>
                        ) : (
                            <ol className="rows">
                                {list.map((album, i) => {
                                    const isSaved = savedKeys.has(albumKey(album));
                                    return (
                                        <li key={itemKey(album)} className="row">
                                            <button
                                                type="button"
                                                className="row__pick"
                                                onClick={() => {
                                                    showAlbum(album);
                                                    router.push('/');
                                                }}
                                            >
                                                <span className="row__num" aria-hidden>
                                                    {String(i + 1).padStart(2, '0')}
                                                </span>
                                                <span className="row__cover">
                                                    <AlbumThumb album={album} />
                                                </span>
                                                <span className="row__meta">
                                                    <span className="row__name">{album.name}</span>
                                                    <span className="row__sub">
                                                        {album.artist} ·{' '}
                                                        <span className="row__mode">
                                                            {skin === 'kaseta'
                                                                ? t(
                                                                      album.mode === 'search'
                                                                          ? 'history.sideB'
                                                                          : 'history.sideA',
                                                                  )
                                                                : t(MODE_BADGE[album.mode])}
                                                        </span>
                                                    </span>
                                                </span>
                                            </button>
                                            <button
                                                type="button"
                                                className="row__action"
                                                onClick={() => toggleSave(album)}
                                                aria-pressed={isSaved}
                                                aria-label={
                                                    isSaved ? t('card.unsave') : t('card.save')
                                                }
                                                title={isSaved ? t('card.unsave') : t('card.save')}
                                            >
                                                <StarIcon
                                                    size={18}
                                                    strokeWidth={1.8}
                                                    filled={isSaved}
                                                />
                                            </button>
                                        </li>
                                    );
                                })}
                            </ol>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
