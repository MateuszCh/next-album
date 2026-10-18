'use client';

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { useI18n } from '@/components/LanguageProvider';
import { useTheme } from '@/components/ThemeProvider';
import { DIMENSIONS, PICKERS, useAppData, type TagDimension } from '@/components/AppDataProvider';

// Genres shown before "+ N" (Okładka chips / two rows of Tuner keys).
const GENRES_COLLAPSED = 5;

type Item = { tag: string; label: string };

/**
 * The album search filters: genre as chips (Okładka) or preset keys (Tuner),
 * collapsed to a few plus "+ N"; decade and country as two tiles that open a
 * multi-select list. All three dimensions are multi-select.
 */
export function SearchFilters({ disabled }: { disabled?: boolean }) {
    const { t } = useI18n();
    const { skin } = useTheme();
    const { filters, toggleTag, resetFilters } = useAppData();
    const tuner = skin === 'tuner';
    const [expanded, setExpanded] = useState(false);
    const [open, setOpen] = useState<TagDimension | null>(null);
    const pickersRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLUListElement>(null);
    const menuId = useId();

    // Close the open list on an outside click or Escape.
    useEffect(() => {
        if (!open) return;
        // Bring the list up from under the fixed bottom nav (CSS scroll-margin).
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        menuRef.current?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
        const onDown = (e: MouseEvent) => {
            if (!pickersRef.current?.contains(e.target as Node)) setOpen(null);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(null);
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    // Countries are translated; genres and decades are proper-noun labels.
    const itemsOf = (dim: TagDimension): Item[] => {
        const cfg = PICKERS[dim];
        return cfg.labelKey
            ? cfg.items.map((item) => ({ ...item, label: t(`${cfg.labelKey}.${item.tag}`) }))
            : cfg.items;
    };

    const genres = itemsOf('genre');
    const selectedGenres = filters.genre;
    // Collapsed: the first few plus any selected further down the list.
    const shownGenres = expanded
        ? genres
        : genres.filter((g, i) => i < GENRES_COLLAPSED || selectedGenres.includes(g.tag));
    const hiddenCount = genres.length - shownGenres.length;
    const activeCount = DIMENSIONS.reduce((n, dim) => n + filters[dim].length, 0);

    const genreLabel = tuner
        ? `${t('filter.presets')} · ${t('filter.genre')}${
              selectedGenres.length === 0 ? ` (${t('genre.any')})` : ''
          }`
        : t('filter.genre');

    return (
        <div className="filters">
            <div className="filters__genre">
                <div className="filters__head">
                    <span className="filter-label">{genreLabel}</span>
                    {activeCount > 0 && (
                        <button
                            type="button"
                            className="filters-reset"
                            onClick={resetFilters}
                            disabled={disabled}
                        >
                            {t('filter.reset')}
                        </button>
                    )}
                </div>
                <div className="chips">
                    {shownGenres.map((g) => {
                        const on = selectedGenres.includes(g.tag);
                        return (
                            <button
                                key={g.tag}
                                type="button"
                                className="chip"
                                aria-pressed={on}
                                onClick={() => toggleTag('genre', g.tag)}
                                disabled={disabled}
                            >
                                <span className="led" aria-hidden />
                                {g.label}
                            </button>
                        );
                    })}
                    {(hiddenCount > 0 || expanded) && (
                        <button
                            type="button"
                            className="chip chip--more"
                            aria-expanded={expanded}
                            aria-label={expanded ? t('filter.less') : t('filter.showAll')}
                            onClick={() => setExpanded((e) => !e)}
                        >
                            {expanded
                                ? t('filter.less')
                                : tuner
                                  ? `${t('filter.more')} +${hiddenCount}`
                                  : `+ ${hiddenCount}`}
                        </button>
                    )}
                </div>
            </div>

            <div className="pickers" ref={pickersRef}>
                {(['decade', 'country'] as const).map((dim) => {
                    const items = itemsOf(dim);
                    const selected = items.filter((i) => filters[dim].includes(i.tag));
                    // Tuner knob: points at the first pick along the list.
                    const at = selected.length ? items.indexOf(selected[0]) : -1;
                    const angle = at < 0 ? 0 : -135 + (270 * at) / Math.max(1, items.length - 1);
                    return (
                        <button
                            key={dim}
                            type="button"
                            className="picker"
                            aria-haspopup="listbox"
                            aria-expanded={open === dim}
                            aria-controls={open === dim ? menuId : undefined}
                            data-active={selected.length > 0 || undefined}
                            onClick={() => setOpen((o) => (o === dim ? null : dim))}
                            disabled={disabled}
                        >
                            <span
                                className="picker__knob"
                                aria-hidden
                                style={{ '--angle': `${angle}deg` } as CSSProperties}
                            />
                            <span className="picker__text">
                                <span className="picker__label">{t(`filter.${dim}`)}</span>
                                <span className="picker__value">
                                    {selected.length
                                        ? selected.map((i) => i.label).join(', ')
                                        : t(`${dim}.any`)}
                                </span>
                            </span>
                        </button>
                    );
                })}
                {open && (
                    <ul
                        ref={menuRef}
                        id={menuId}
                        className="picker-menu"
                        role="listbox"
                        aria-multiselectable
                        aria-label={t(`filter.${open}`)}
                    >
                        {itemsOf(open).map((item) => (
                            <li
                                key={item.tag}
                                role="option"
                                aria-selected={filters[open].includes(item.tag)}
                            >
                                <button type="button" onClick={() => toggleTag(open, item.tag)}>
                                    {item.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
