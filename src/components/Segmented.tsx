'use client';

import { useRef, type KeyboardEvent } from 'react';

export interface SegmentedOption<T extends string> {
    value: T;
    label: string;
    disabled?: boolean;
}

interface Props<T extends string> {
    /** `tabs` switches a view (tablist), `radio` picks a setting (radiogroup). */
    kind: 'tabs' | 'radio';
    label: string;
    options: SegmentedOption<T>[];
    value: T;
    onChange: (value: T) => void;
    /** Smaller segments, for the header and settings rows. */
    compact?: boolean;
    disabled?: boolean;
    describedBy?: string;
    /** Tabs: id prefix linking each tab to its panel (`<prefix>-<value>`). */
    panelIdPrefix?: string;
    className?: string;
}

/**
 * A segmented switch: a pill track with the selected segment inverted in
 * Okładka, a row of keys with a lit LED in Tuner. Arrow keys move the selection.
 */
export function Segmented<T extends string>({
    kind,
    label,
    options,
    value,
    onChange,
    compact = false,
    disabled = false,
    describedBy,
    panelIdPrefix,
    className = '',
}: Props<T>) {
    const refs = useRef<(HTMLButtonElement | null)[]>([]);
    const enabled = options.filter((o) => !o.disabled);

    const onKeyDown = (e: KeyboardEvent) => {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!step || enabled.length < 2) return;
        e.preventDefault();
        const at = enabled.findIndex((o) => o.value === value);
        const next = enabled[(at + step + enabled.length) % enabled.length];
        onChange(next.value);
        refs.current[options.indexOf(next)]?.focus();
    };

    return (
        <div
            className={`seg${compact ? ' seg--compact' : ''} ${className}`}
            role={kind === 'tabs' ? 'tablist' : 'radiogroup'}
            aria-label={label}
            aria-describedby={describedBy}
            onKeyDown={onKeyDown}
        >
            {options.map((o, i) => {
                const selected = o.value === value;
                return (
                    <button
                        key={o.value}
                        ref={(el) => {
                            refs.current[i] = el;
                        }}
                        type="button"
                        className="seg__opt"
                        role={kind === 'tabs' ? 'tab' : 'radio'}
                        aria-selected={kind === 'tabs' ? selected : undefined}
                        aria-checked={kind === 'radio' ? selected : undefined}
                        aria-controls={
                            kind === 'tabs' && panelIdPrefix
                                ? `${panelIdPrefix}-${o.value}`
                                : undefined
                        }
                        id={
                            kind === 'tabs' && panelIdPrefix
                                ? `${panelIdPrefix}-tab-${o.value}`
                                : undefined
                        }
                        tabIndex={selected ? 0 : -1}
                        disabled={disabled || o.disabled}
                        onClick={() => onChange(o.value)}
                    >
                        <span className="led" aria-hidden />
                        {o.label}
                    </button>
                );
            })}
        </div>
    );
}
