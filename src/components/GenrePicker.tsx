'use client';

import { useEffect, useRef, useState } from 'react';

interface Item {
    tag: string;
    label: string;
}

interface Props {
    items: Item[];
    selected: string[];
    onToggle: (tag: string) => void;
    placeholder: string;
    disabled?: boolean;
}

/**
 * Generic multi-select tag picker used for the genre / mood / decade filters.
 * Desktop shows a chip grid; mobile (via media query) swaps to a scrollable
 * dropdown that stays open so several tags can be toggled at once.
 */
export function GenrePicker({ items, selected, onToggle, placeholder, disabled }: Props) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const isSelected = (tag: string) => selected.includes(tag);
    const selectedLabels = items
        .filter((g) => selected.includes(g.tag))
        .map((g) => g.label)
        .join(', ');

    // Close on outside click / Escape.
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    return (
        <>
            {/* Desktop: chip grid */}
            <div className="genre-grid">
                {items.map((g) => (
                    <button
                        key={g.tag}
                        type="button"
                        aria-pressed={isSelected(g.tag)}
                        className={`genre-chip${isSelected(g.tag) ? ' selected' : ''}`}
                        onClick={() => onToggle(g.tag)}
                        disabled={disabled}
                    >
                        {g.label}
                    </button>
                ))}
            </div>

            {/* Mobile: custom scrollable dropdown (multi-select, stays open) */}
            <div className="genre-dropdown" ref={ref}>
                <button
                    type="button"
                    className="genre-dropdown-trigger"
                    onClick={() => setOpen((o) => !o)}
                    disabled={disabled}
                    aria-haspopup="listbox"
                    aria-expanded={open}
                >
                    <span className={selectedLabels ? '' : 'placeholder'}>
                        {selectedLabels || placeholder}
                    </span>
                    <svg
                        className={`genre-dropdown-chevron${open ? ' open' : ''}`}
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden
                    >
                        <path
                            d="M6 9l6 6 6-6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>
                {open && (
                    <ul className="genre-dropdown-menu" role="listbox" aria-multiselectable>
                        {items.map((g) => (
                            <li key={g.tag} role="option" aria-selected={isSelected(g.tag)}>
                                <button
                                    type="button"
                                    className={isSelected(g.tag) ? 'selected' : ''}
                                    onClick={() => onToggle(g.tag)}
                                >
                                    {g.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
}
