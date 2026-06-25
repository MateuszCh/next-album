'use client';

import { useI18n } from '@/components/LanguageProvider';

export type FlowMode = 'surprise' | 'genre';

interface Props {
    value: FlowMode;
    onChange: (mode: FlowMode) => void;
    disabled?: boolean;
}

export function FlowToggle({ value, onChange, disabled }: Props) {
    const { t } = useI18n();
    return (
        <div className="flow-toggle" role="tablist" aria-label={t('flow.aria')}>
            <button
                role="tab"
                aria-selected={value === 'surprise'}
                className={value === 'surprise' ? 'active' : ''}
                onClick={() => onChange('surprise')}
                disabled={disabled}
            >
                {t('flow.surprise')}
            </button>
            <button
                role="tab"
                aria-selected={value === 'genre'}
                className={value === 'genre' ? 'active' : ''}
                onClick={() => onChange('genre')}
                disabled={disabled}
            >
                {t('flow.genre')}
            </button>
        </div>
    );
}
