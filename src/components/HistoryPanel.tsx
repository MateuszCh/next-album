'use client';

import { useState } from 'react';
import { upgradeLastfmImage } from '@/lib/coverart';
import { useI18n } from '@/components/LanguageProvider';
import type { AlbumRecommendation } from '@/lib/lastfm/types';

interface Props {
    history: AlbumRecommendation[];
    saved: AlbumRecommendation[];
    onPick: (album: AlbumRecommendation) => void;
    onRemoveSaved: (album: AlbumRecommendation) => void;
}

type Tab = 'history' | 'saved';

function itemKey(a: AlbumRecommendation): string {
    return `${a.artist}::${a.name}`.toLowerCase();
}

export function HistoryPanel({ history, saved, onPick, onRemoveSaved }: Props) {
    const { t } = useI18n();
    const [tab, setTab] = useState<Tab>('history');

    // Nothing rolled and nothing saved yet — keep the page clean.
    if (history.length === 0 && saved.length === 0) return null;

    const list = tab === 'history' ? history : saved;
    const emptyKey = tab === 'history' ? 'history.emptyHistory' : 'history.emptySaved';

    return (
        <div className="history">
            <div className="flow-toggle history-tabs" role="tablist">
                <button
                    role="tab"
                    aria-selected={tab === 'history'}
                    className={tab === 'history' ? 'active' : ''}
                    onClick={() => setTab('history')}
                >
                    {t('history.title')}
                </button>
                <button
                    role="tab"
                    aria-selected={tab === 'saved'}
                    className={tab === 'saved' ? 'active' : ''}
                    onClick={() => setTab('saved')}
                >
                    {t('history.saved')}
                </button>
            </div>

            {list.length === 0 ? (
                <p className="history-empty">{t(emptyKey)}</p>
            ) : (
                <ul className="history-list">
                    {list.map((album) => (
                        <li key={itemKey(album)} className="history-item">
                            <button
                                type="button"
                                className="history-pick"
                                onClick={() => onPick(album)}
                            >
                                <span className="history-cover">
                                    {album.imageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={upgradeLastfmImage(album.imageUrl)}
                                            alt=""
                                            loading="lazy"
                                        />
                                    ) : (
                                        <span className="placeholder" aria-hidden>
                                            ♪
                                        </span>
                                    )}
                                </span>
                                <span className="history-meta">
                                    <span className="history-name">{album.name}</span>
                                    <span className="history-artist">{album.artist}</span>
                                </span>
                            </button>
                            {tab === 'saved' && (
                                <button
                                    type="button"
                                    className="history-remove"
                                    onClick={() => onRemoveSaved(album)}
                                    aria-label={t('history.remove')}
                                    title={t('history.remove')}
                                >
                                    ×
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
