'use client';

import { useRef, type KeyboardEvent } from 'react';
import { useI18n } from '@/components/LanguageProvider';
import { useTheme } from '@/components/ThemeProvider';
import { SKINS, themeFor, type Skin } from '@/lib/skin';

/**
 * The choice between the Okładka and Tuner skins. Each card shows a live
 * thumbnail that carries its own `data-theme`, so it always paints its skin
 * (Okładka in the current dark/light mode). Applies immediately.
 */
export function StylePicker() {
    const { t } = useI18n();
    const { skin, mode, setSkin } = useTheme();
    const refs = useRef<Record<Skin, HTMLButtonElement | null>>({ okladka: null, tuner: null });

    const choose = (next: Skin) => {
        setSkin(next);
        refs.current[next]?.focus();
    };

    const onKeyDown = (e: KeyboardEvent) => {
        if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) return;
        e.preventDefault();
        choose(skin === 'okladka' ? 'tuner' : 'okladka');
    };

    return (
        <div
            className={`sk-style${skin === 'tuner' ? ' sk-style--key' : ''}`}
            role="radiogroup"
            aria-label={t('settings.style')}
            onKeyDown={onKeyDown}
        >
            {SKINS.map((s) => (
                <button
                    key={s}
                    ref={(el) => {
                        refs.current[s] = el;
                    }}
                    type="button"
                    className="sk-style__option"
                    role="radio"
                    aria-checked={skin === s}
                    tabIndex={skin === s ? 0 : -1}
                    onClick={() => choose(s)}
                >
                    <span className="sk-style__thumb" data-theme={themeFor(s, mode)} aria-hidden>
                        {s === 'tuner' ? (
                            <span className="sk-thumb-tuner">
                                <span />
                                <span />
                                <span />
                            </span>
                        ) : (
                            <span className="sk-thumb-okladka">
                                <span />
                                <span />
                                <span />
                                <span />
                            </span>
                        )}
                    </span>
                    <span className={`sk-style__name sk-style__name--${s}`}>{t(`style.${s}`)}</span>
                    <span className="sk-style__desc">{t(`style.${s}Note`)}</span>
                </button>
            ))}
        </div>
    );
}
