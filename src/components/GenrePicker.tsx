'use client';

import { GENRES } from '@/lib/recommend/genres';

interface Props {
    selected: string | null;
    onPick: (tag: string) => void;
    disabled?: boolean;
}

export function GenrePicker({ selected, onPick, disabled }: Props) {
    return (
        <div className="genre-grid">
            {GENRES.map((g) => (
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
    );
}
