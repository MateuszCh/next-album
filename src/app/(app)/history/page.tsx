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
import { countLabel } from '@/lib/i18n';
import { albumKey } from '@/lib/history';

type Filter = 'all' | 'lastfm' | 'search';

const FILTERS: Filter[] = ['all', 'lastfm', 'search'];

/** Historia: every rolled album, filterable by mode; a row re-opens it on Losuj. */
export default function HistoryPage() {
    const { t, lang } = useI18n();
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
                        {countLabel(t, lang, 'count.albums', list.length)}
                    </span>
                )}
            </header>

            {!dataReady ? (
                <RowsSkeleton />
            ) : history.length === 0 ? (
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
                    />
                    <div
                        role="tabpanel"
                        id={`history-${filter}`}
                        aria-labelledby={`history-tab-${filter}`}
                    >
                        {list.length === 0 ? (
                            <p className="screen-empty">{t('history.emptyFilter')}</p>
                        ) : (
                            <ul className="rows">
                                {list.map((album) => {
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
                                                <span className="row__cover">
                                                    <AlbumThumb album={album} />
                                                </span>
                                                <span className="row__meta">
                                                    <span className="row__name">{album.name}</span>
                                                    <span className="row__sub">
                                                        {album.artist} · {t(MODE_BADGE[album.mode])}
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
                            </ul>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
