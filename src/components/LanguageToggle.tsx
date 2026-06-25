'use client';

import { LANGS } from '@/lib/i18n';
import { useI18n } from '@/components/LanguageProvider';

export function LanguageToggle() {
    const { lang, setLang, t } = useI18n();
    return (
        <div className="lang-toggle" role="group" aria-label={t('lang.aria')}>
            {LANGS.map((l) => (
                <button
                    key={l}
                    type="button"
                    className={l === lang ? 'active' : ''}
                    aria-pressed={l === lang}
                    onClick={() => setLang(l)}
                >
                    {l.toUpperCase()}
                </button>
            ))}
        </div>
    );
}
