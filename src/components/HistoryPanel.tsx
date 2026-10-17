'use client';

import { useState } from 'react';
import { upgradeLastfmImage } from '@/lib/coverart';
import { albumKey } from '@/lib/history';
import { useI18n } from '@/components/LanguageProvider';
import type { AlbumRecommendation } from '@/lib/lastfm/types';

interface Props {
    history: AlbumRecommendation[];
    saved: AlbumRecommendation[];
    onPick: (album: AlbumRecommendation) => void;
    onToggleSave: (album: AlbumRecommendation) => void;
    onRemoveSaved: (album: AlbumRecommendation) => void;
}

type Tab = 'history' | 'saved';

// React key: the raw name pair. History stored before keys were normalized can
// hold two editions of one album, which would collide on `albumKey`.
function itemKey(a: AlbumRecommendation): string {
    return `${a.artist}::${a.name}`.toLowerCase();
}

export function HistoryPanel({ history, saved, onPick, onToggleSave, onRemoveSaved }: Props) {
    const { t } = useI18n();
    const [tab, setTab] = useState<Tab>('history');

    // Only offer a tab for a list that actually has something in it.
    const tabs: Tab[] = [];
    if (history.length > 0) tabs.push('history');
    if (saved.length > 0) tabs.push('saved');

    // Nothing rolled and nothing saved yet — keep the page clean.
    if (tabs.length === 0) return null;

    // If the selected tab's list emptied out (e.g. the last saved album was
    // removed), fall back to whichever tab still has content.
    const activeTab = tabs.includes(tab) ? tab : tabs[0];
    const list = activeTab === 'history' ? history : saved;

    // Lets each history row show whether it's already saved.
    const savedKeys = new Set(saved.map(albumKey));

    const label = (tb: Tab) => (tb === 'history' ? t('history.title') : t('history.saved'));

    return (
        <div className="history">
            <div className="history-tabs" role="tablist">
                {tabs.map((tb) => (
                    <button
                        key={tb}
                        role="tab"
                        aria-selected={activeTab === tb}
                        className={activeTab === tb ? 'active' : ''}
                        onClick={() => setTab(tb)}
                    >
                        {label(tb)}
                    </button>
                ))}
            </div>

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
                        {activeTab === 'history' &&
                            (() => {
                                const isSaved = savedKeys.has(albumKey(album));
                                return (
                                    <button
                                        type="button"
                                        className={`history-save${isSaved ? ' saved' : ''}`}
                                        onClick={() => onToggleSave(album)}
                                        aria-pressed={isSaved}
                                        aria-label={isSaved ? t('card.unsave') : t('card.save')}
                                        title={isSaved ? t('card.unsave') : t('card.save')}
                                    >
                                        <svg viewBox="0 0 24 24" aria-hidden width="18" height="18">
                                            <path
                                                d="M12 17.3l-5.4 3.2 1.4-6.1-4.7-4.1 6.2-.5L12 4l2.5 5.8 6.2.5-4.7 4.1 1.4 6.1z"
                                                fill={isSaved ? 'currentColor' : 'none'}
                                                stroke="currentColor"
                                                strokeWidth="1.6"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    </button>
                                );
                            })()}
                        {activeTab === 'saved' && (
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
        </div>
    );
}
