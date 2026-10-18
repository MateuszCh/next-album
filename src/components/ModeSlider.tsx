'use client';

import { useId, type CSSProperties } from 'react';
import { useI18n } from '@/components/LanguageProvider';
import { useTheme } from '@/components/ThemeProvider';

interface Props {
    value: number; // 0..1 (0 = only favorites, 1 = only discovery)
    onChange: (value: number) => void;
    disabled?: boolean;
}

/**
 * The favorites ↔ discovery balance: a slim slider in Okładka, a tuning scale
 * with a red needle in Tuner. Both are a real range input.
 */
export function ModeSlider({ value, onChange, disabled }: Props) {
    const { t } = useI18n();
    const { skin } = useTheme();
    const id = useId();

    const input = (
        <input
            id={id}
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
    );
    const labels = (
        <>
            <span>{t('slider.favorites')}</span>
            <span>{t('slider.discovery')}</span>
        </>
    );

    if (skin === 'tuner') {
        return (
            <div className="sk-balance sk-balance--tuner">
                <span className="tun-label">{t('tuner.tuning')}</span>
                <div className="sk-balance__scale">{input}</div>
                <div className="sk-balance__labels" aria-hidden>
                    {labels}
                </div>
            </div>
        );
    }

    return (
        <div className="sk-balance sk-balance--slider">
            <label className="sk-balance__labels" htmlFor={id}>
                {labels}
            </label>
            {input}
        </div>
    );
}
