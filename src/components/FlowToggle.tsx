'use client';

import { useI18n } from '@/components/LanguageProvider';

export type FlowMode = 'surprise' | 'genre' | 'mood' | 'decade' | 'current';

const MODES: { mode: FlowMode; key: string }[] = [
    { mode: 'surprise', key: 'flow.surprise' },
    { mode: 'current', key: 'flow.current' },
    { mode: 'genre', key: 'flow.genre' },
    { mode: 'mood', key: 'flow.mood' },
    { mode: 'decade', key: 'flow.decade' },
];

interface Props {
    value: FlowMode;
    onChange: (mode: FlowMode) => void;
    disabled?: boolean;
}

export function FlowToggle({ value, onChange, disabled }: Props) {
    const { t } = useI18n();
    return (
        <div className="flow-toggle" role="tablist" aria-label={t('flow.aria')}>
            {MODES.map(({ mode, key }) => (
                <button
                    key={mode}
                    role="tab"
                    aria-selected={value === mode}
                    className={value === mode ? 'active' : ''}
                    onClick={() => onChange(mode)}
                    disabled={disabled}
                >
                    {t(key)}
                </button>
            ))}
        </div>
    );
}
