'use client';

import { useId, type CSSProperties } from 'react';
import { useI18n } from '@/components/LanguageProvider';
import { useTheme } from '@/components/ThemeProvider';

interface Props {
    value: number; // 0..1 (0 = only favorites, 1 = only discovery)
    onChange: (value: number) => void;
    disabled?: boolean;
}

// Rave's EQ: bar heights (px) rising left to right.
const EQ_BARS = [14, 20, 26, 31, 36, 40, 44, 47, 50, 53, 56, 58, 60, 62, 63, 64];

/**
 * The favorites ↔ discovery balance, always a real range input: a slim slider
 * (Okładka, Ambient; a chunky one in Guma), a tuning scale with a needle
 * (Tuner), or a slider under a picture of the value — two tape reels that wind
 * from one to the other (Kaseta), EQ bars lit up to the value (Rave).
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
    // A decorative copy of the labels next to a graphic; the input carries the name.
    const plainLabels = (
        <div className="sk-balance__labels" aria-hidden>
            {labels}
        </div>
    );

    switch (skin) {
        case 'tuner':
            return (
                <div className="sk-balance sk-balance--tuner">
                    <span className="tun-label">{t('tuner.tuning')}</span>
                    <div className="sk-balance__scale">{input}</div>
                    {plainLabels}
                </div>
            );
        case 'kaseta': {
            // Favourites on the left reel, discovery on the right: the tape winds
            // over as the balance moves.
            const reel = (share: number) => ({ '--reel': `${44 + 32 * share}px` }) as CSSProperties;
            return (
                <div className="sk-balance sk-balance--kaseta">
                    <span className="sk-balance__title">{t('balance.tape')}</span>
                    <div className="sk-balance__deck" aria-hidden>
                        <span className="sk-balance__tape" />
                        <span className="sk-balance__reel" style={reel(1 - value)} />
                        <span className="sk-balance__reel" style={reel(value)} />
                    </div>
                    {plainLabels}
                    {input}
                </div>
            );
        }
        case 'rave': {
            const lit = Math.round(value * (EQ_BARS.length - 1));
            return (
                <div className="sk-balance sk-balance--rave">
                    <span className="sk-balance__title">{t('balance.eq')}</span>
                    <div className="sk-balance__eq" aria-hidden>
                        {EQ_BARS.map((height, i) => (
                            <span
                                key={i}
                                data-level={i < lit ? 'on' : i === lit ? 'peak' : undefined}
                                style={{ height }}
                            />
                        ))}
                    </div>
                    {input}
                    {plainLabels}
                </div>
            );
        }
        default:
            // Okładka and Ambient: labels above; Guma: below (CSS order).
            return (
                <div className={`sk-balance sk-balance--slider sk-balance--${skin}`}>
                    <label className="sk-balance__labels" htmlFor={id}>
                        {labels}
                    </label>
                    {input}
                </div>
            );
    }
}
