'use client';

export type FlowMode = 'surprise' | 'genre';

interface Props {
    value: FlowMode;
    onChange: (mode: FlowMode) => void;
    disabled?: boolean;
}

export function FlowToggle({ value, onChange, disabled }: Props) {
    return (
        <div className="flow-toggle" role="tablist" aria-label="Recommendation mode">
            <button
                role="tab"
                aria-selected={value === 'surprise'}
                className={value === 'surprise' ? 'active' : ''}
                onClick={() => onChange('surprise')}
                disabled={disabled}
            >
                Surprise me
            </button>
            <button
                role="tab"
                aria-selected={value === 'genre'}
                className={value === 'genre' ? 'active' : ''}
                onClick={() => onChange('genre')}
                disabled={disabled}
            >
                By genre
            </button>
        </div>
    );
}
