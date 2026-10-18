'use client';

import { useRef, type KeyboardEvent } from 'react';
import { useI18n } from '@/components/LanguageProvider';
import { useTheme } from '@/components/ThemeProvider';
import { Stripes } from '@/components/Icons';
import { SKIN_MODES, SKINS, themeFor, type Skin } from '@/lib/skin';

// A miniature of each skin's Losuj screen (drawn by `.sk-thumb-<skin>`).
const THUMBS: Record<Skin, React.ReactNode> = {
    okladka: (
        <span className="sk-thumb-okladka">
            <span />
            <span />
            <span />
            <span />
        </span>
    ),
    tuner: (
        <span className="sk-thumb-tuner">
            <span />
            <span />
            <span />
        </span>
    ),
    kaseta: (
        <span className="sk-thumb-kaseta">
            <span className="sk-thumb__card">
                <span className="sk-thumb__cover" />
                <Stripes />
            </span>
            <span className="sk-thumb__cta" />
        </span>
    ),
    rave: (
        <span className="sk-thumb-rave">
            <span className="sk-thumb__cover" />
            <span className="sk-thumb__cta" />
        </span>
    ),
    guma: (
        <span className="sk-thumb-guma">
            <span className="sk-thumb__cover" />
            <span className="sk-thumb__cta" />
            <span className="sk-thumb__sticker" />
        </span>
    ),
    ambient: (
        <span className="sk-thumb-ambient">
            <span className="sk-thumb__cover" />
            <span className="sk-thumb__cta" />
        </span>
    ),
};

/** The note under a style's name: which modes it comes in. */
function modesNote(skin: Skin): string {
    const modes = SKIN_MODES[skin];
    return modes.length > 1 ? 'style.modes.both' : `style.modes.${modes[0]}`;
}

/**
 * The choice between the six skins. Each card shows a live thumbnail that
 * carries its own `data-theme`, so it always paints its skin (Okładka in the
 * current dark/light mode). Applies immediately; arrow keys move the choice.
 */
export function StylePicker() {
    const { t } = useI18n();
    const { skin, mode, setSkin } = useTheme();
    const refs = useRef<Partial<Record<Skin, HTMLButtonElement | null>>>({});

    const choose = (next: Skin) => {
        setSkin(next);
        refs.current[next]?.focus();
    };

    const onKeyDown = (e: KeyboardEvent) => {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!step) return;
        e.preventDefault();
        const at = SKINS.indexOf(skin);
        choose(SKINS[(at + step + SKINS.length) % SKINS.length]);
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
                        {THUMBS[s]}
                    </span>
                    <span className={`sk-style__name sk-style__name--${s}`}>{t(`style.${s}`)}</span>
                    <span className="sk-style__desc">{t(modesNote(s))}</span>
                </button>
            ))}
        </div>
    );
}
