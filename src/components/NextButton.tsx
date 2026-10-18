'use client';

import { useI18n } from '@/components/LanguageProvider';
import { useTheme } from '@/components/ThemeProvider';
import { FastForwardIcon, SkipIcon, SlidersIcon, StarIcon } from '@/components/Icons';

interface Props {
    onNext: () => void;
    loading: boolean;
    /** Okładka: the line under the play button (defaults to "Next Album"). */
    caption?: string;
    /** Okładka: the save star beside the play button; absent → shown disabled. */
    save?: { saved: boolean; onToggle: () => void };
    /** Okładka: the button beside play that jumps to the pick settings / filters. */
    settings?: { label: string; onClick: () => void };
}

/**
 * The one primary action — roll the next album: a round play button flanked by
 * save and settings in Okładka, a full-width hardware key in Tuner (where save
 * and the listen links sit in the key row below it).
 */
export function NextButton({ onNext, loading, caption, save, settings }: Props) {
    const { t } = useI18n();
    const { skin } = useTheme();
    const label = loading ? t('btn.rolling') : t('btn.next');

    if (skin === 'tuner') {
        return (
            <button type="button" className="sk-next--key" onClick={onNext} disabled={loading}>
                {label}
                <FastForwardIcon />
            </button>
        );
    }

    return (
        <div className="sk-next--play">
            <div className="sk-next__row">
                <button
                    type="button"
                    className="sk-next__side"
                    onClick={save?.onToggle}
                    disabled={!save}
                    aria-pressed={save?.saved ?? false}
                    aria-label={save?.saved ? t('card.unsave') : t('card.save')}
                    title={save?.saved ? t('card.unsave') : t('card.save')}
                >
                    <StarIcon filled={save?.saved} />
                </button>
                <button
                    type="button"
                    className="sk-next__main"
                    onClick={onNext}
                    disabled={loading}
                    aria-label={label}
                    title={label}
                >
                    <SkipIcon />
                </button>
                <button
                    type="button"
                    className="sk-next__side"
                    onClick={settings?.onClick}
                    disabled={!settings}
                    aria-label={settings?.label}
                    title={settings?.label}
                >
                    <SlidersIcon />
                </button>
            </div>
            <span className="sk-next__caption" aria-live="polite">
                {loading ? t('btn.rolling') : (caption ?? t('btn.next'))}
            </span>
        </div>
    );
}
