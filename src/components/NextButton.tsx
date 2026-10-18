'use client';

import { useI18n } from '@/components/LanguageProvider';
import { useTheme } from '@/components/ThemeProvider';
import { ArrowIcon, FastForwardIcon, SkipIcon, SlidersIcon, StarIcon } from '@/components/Icons';
import type { Skin } from '@/lib/skin';

interface Props {
    onNext: () => void;
    loading: boolean;
    /** The line under the button where the skin has one (defaults to "Next Album"). */
    caption?: string;
    /** The save toggle beside the button; absent (nothing picked) → shown disabled. */
    save?: { saved: boolean; onToggle: () => void };
    /** The button that jumps to the pick settings / filters; `short` labels a key. */
    settings?: { label: string; short: string; onClick: () => void };
}

type Side = 'icon' | 'key';

// What sits around the Next button in each skin; the styles do the rest.
// `icon` side buttons are round and unlabelled, `key` ones carry a label.
// Where there is no save beside it, Save sits in the listen-links row instead.
const PARTS: Record<
    Skin,
    { save?: Side; settings?: Side; icon: 'skip' | 'ff' | 'arrow'; text: boolean; caption?: true }
> = {
    okladka: { save: 'icon', settings: 'icon', icon: 'skip', text: false, caption: true },
    tuner: { icon: 'ff', text: true },
    kaseta: { save: 'key', settings: 'key', icon: 'ff', text: true },
    rave: { icon: 'ff', text: true },
    ambient: { save: 'icon', icon: 'ff', text: true },
    guma: { save: 'icon', settings: 'icon', icon: 'arrow', text: true },
};

const ICONS = { skip: <SkipIcon />, ff: <FastForwardIcon />, arrow: <ArrowIcon /> };

/**
 * The one primary action — roll the next album: a round play button flanked by
 * save and settings (Okładka), a full-width key (Tuner, Rave), three hardware
 * keys (Kaseta), a pill beside a round save (Ambient, Guma — Guma adds filters).
 */
export function NextButton({ onNext, loading, caption, save, settings }: Props) {
    const { t } = useI18n();
    const { skin } = useTheme();
    const parts = PARTS[skin];
    const label = loading ? t('btn.rolling') : t('btn.next');
    const saveLabel = save?.saved ? t('card.unsave') : t('card.save');

    return (
        <div className={`sk-next sk-next--${skin}`}>
            <div className="sk-next__row">
                {parts.save && (
                    <button
                        type="button"
                        className="sk-next__side sk-next__save"
                        onClick={save?.onToggle}
                        disabled={!save}
                        aria-pressed={save?.saved ?? false}
                        aria-label={parts.save === 'icon' ? saveLabel : undefined}
                        title={saveLabel}
                    >
                        <StarIcon size={parts.save === 'key' ? 20 : 24} filled={save?.saved} />
                        {parts.save === 'key' && (
                            <span>{save?.saved ? t('key.saved') : t('key.save')}</span>
                        )}
                    </button>
                )}
                <button
                    type="button"
                    className="sk-next__main"
                    onClick={onNext}
                    disabled={loading}
                    aria-label={parts.text ? undefined : label}
                    title={parts.text ? undefined : label}
                >
                    {parts.text && <span>{label}</span>}
                    {ICONS[parts.icon]}
                </button>
                {parts.settings && (
                    <button
                        type="button"
                        className="sk-next__side"
                        onClick={settings?.onClick}
                        disabled={!settings}
                        aria-label={parts.settings === 'icon' ? settings?.label : undefined}
                        title={settings?.label}
                    >
                        <SlidersIcon size={parts.settings === 'key' ? 20 : 24} />
                        {parts.settings === 'key' && <span>{settings?.short}</span>}
                    </button>
                )}
            </div>
            {parts.caption && (
                <span className="sk-next__caption" aria-live="polite">
                    {loading ? t('btn.rolling') : (caption ?? t('btn.next'))}
                </span>
            )}
        </div>
    );
}
