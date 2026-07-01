'use client';

import { useEffect, useRef, useState } from 'react';

interface Item {
    tag: string;
    label: string;
}

interface Props {
    items: Item[];
    selected: string | null;
    onPick: (tag: string) => void;
    placeholder: string;
    disabled?: boolean;
}

/**
 * Generic tag picker used for the genre / mood / decade dimensions. Desktop
 * shows a chip grid; mobile (via media query) swaps to a scrollable dropdown.
 */
export function GenrePicker({ items, selected, onPick, placeholder, disabled }: Props) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const selectedLabel = items.find((g) => g.tag === selected)?.label ?? null;

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

    const pick = (tag: string) => {
        onPick(tag);
        setOpen(false);
    };

    return (
        <>
            {/* Desktop: chip grid */}
            <div className="genre-grid">
                {items.map((g) => (
                    <button
                        key={g.tag}
                        type="button"
                        className={`genre-chip${selected === g.tag ? ' selected' : ''}`}
                        onClick={() => onPick(g.tag)}
                        disabled={disabled}
                    >
                        {g.label}
                    </button>
                ))}
            </div>

            {/* Mobile: custom scrollable dropdown */}
            <div className="genre-dropdown" ref={ref}>
                <button
                    type="button"
                    className="genre-dropdown-trigger"
                    onClick={() => setOpen((o) => !o)}
                    disabled={disabled}
                    aria-haspopup="listbox"
                    aria-expanded={open}
                >
                    <span className={selectedLabel ? '' : 'placeholder'}>
                        {selectedLabel ?? placeholder}
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
                    <ul className="genre-dropdown-menu" role="listbox">
                        {items.map((g) => (
                            <li key={g.tag} role="option" aria-selected={selected === g.tag}>
                                <button
                                    type="button"
                                    className={selected === g.tag ? 'selected' : ''}
                                    onClick={() => pick(g.tag)}
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
