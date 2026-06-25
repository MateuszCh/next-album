'use client';

import type { CSSProperties } from 'react';

interface Props {
    value: number; // 0..1 (0 = only favorites, 1 = only discovery)
    onChange: (value: number) => void;
    disabled?: boolean;
}

export function ModeSlider({ value, onChange, disabled }: Props) {
    return (
        <div className="slider-row">
            <div className="slider-labels">
                <span>Favorites</span>
                <span>Discovery</span>
            </div>
            <input
                type="range"
                min={0}
                max={1}
                step="any"
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(Number(e.target.value))}
                style={{ '--pct': `${value * 100}%` } as CSSProperties}
                aria-label="Balance between favorites and discovery"
            />
        </div>
    );
}
