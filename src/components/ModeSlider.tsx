'use client';

import type { CSSProperties } from 'react';
import { useI18n } from '@/components/LanguageProvider';

interface Props {
    value: number; // 0..1 (0 = only favorites, 1 = only discovery)
    onChange: (value: number) => void;
    disabled?: boolean;
}

export function ModeSlider({ value, onChange, disabled }: Props) {
    const { t } = useI18n();
    return (
        <div className="slider-row">
            <div className="slider-labels">
                <span>{t('slider.favorites')}</span>
                <span>{t('slider.discovery')}</span>
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
                aria-label={t('slider.aria')}
            />
        </div>
    );
}
