'use client';

import type { CSSProperties } from 'react';

interface Props {
    value: number; // 0..1 (0 = only favorites, 1 = only discovery)
    onChange: (value: number) => void;
    disabled?: boolean;
}

export function ModeSlider({ value, onChange, disabled }: Props) {
    const pct = Math.round(value * 100);
    return (
        <div className="slider-row">
            <div className="slider-labels">
                <span>
                    Favorites <b>{100 - pct}%</b>
                </span>
                <span>
                    <b>{pct}%</b> Discovery
                </span>
            </div>
            <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={pct}
                disabled={disabled}
                onChange={(e) => onChange(Number(e.target.value) / 100)}
                style={{ '--pct': `${pct}%` } as CSSProperties}
                aria-label="Balance between favorites and discovery"
            />
        </div>
    );
}
