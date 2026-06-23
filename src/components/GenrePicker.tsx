'use client';

import { useEffect, useState } from 'react';

interface GenreOption {
    tag: string;
    label: string;
    forYou: boolean;
}

interface Props {
    selected: string | null;
    onPick: (tag: string) => void;
    disabled?: boolean;
}

export function GenrePicker({ selected, onPick, disabled }: Props) {
    const [genres, setGenres] = useState<GenreOption[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        fetch('/api/genres')
            .then((r) => r.json())
            .then((data: { genres?: GenreOption[] }) => {
                if (!cancelled) setGenres(data.genres ?? []);
            })
            .catch(() => {
                if (!cancelled) setGenres([]);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    if (genres === null) {
        return <p className="hint">Loading genres…</p>;
    }

    // "For you" genres first, keeping the curated order within each group.
    const ordered = [...genres].sort((a, b) => Number(b.forYou) - Number(a.forYou));

    return (
        <div className="genre-grid">
            {ordered.map((g) => (
                <button
                    key={g.tag}
                    type="button"
                    className={`genre-chip${selected === g.tag ? ' selected' : ''}${
                        g.forYou ? ' for-you' : ''
                    }`}
                    onClick={() => onPick(g.tag)}
                    disabled={disabled}
                    title={g.forYou ? 'Matches your taste' : undefined}
                >
                    {g.label}
                    {g.forYou && (
                        <span className="for-you-star" aria-hidden>
                            ★
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}
