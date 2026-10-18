'use client';

import { useId, useState } from 'react';
import { Segmented } from '@/components/Segmented';
import { useI18n } from '@/components/LanguageProvider';
import { errorMessage } from '@/lib/i18n';

type FormMode = 'login' | 'register';

// Must match PASSWORD_MIN in src/lib/accounts.ts (the server re-checks it).
const PASSWORD_MIN = 8;

/** Email + password: log in to an existing account or create one. */
export function EmailLoginForm() {
    const { t } = useI18n();
    const id = useId();
    const [formMode, setFormMode] = useState<FormMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(
                formMode === 'login' ? '/api/auth/email-login' : '/api/auth/register',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                },
            );
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                // data.error is a code; localize at render.
                throw new Error(data.error ?? 'generic');
            }
            // Full navigation: the app merges this browser's guest history/saved
            // into the account on load.
            window.location.href = '/';
        } catch (err) {
            setError(err instanceof Error ? err.message : 'generic');
            setLoading(false);
        }
    }

    const switchMode = (next: FormMode) => {
        setFormMode(next);
        setError(null);
    };

    const canSubmit =
        !loading &&
        email.trim() !== '' &&
        password.length >= (formMode === 'register' ? PASSWORD_MIN : 1);

    return (
        <>
            <Segmented
                kind="tabs"
                label={t('loginPage.email')}
                options={(['login', 'register'] as FormMode[]).map((m) => ({
                    value: m,
                    label: t(`loginPage.tab.${m}`),
                }))}
                value={formMode}
                onChange={switchMode}
                disabled={loading}
            />
            <form onSubmit={submit} className="sk-form">
                <div className="sk-field">
                    <label htmlFor={`${id}-email`}>{t('loginPage.emailPlaceholder')}</label>
                    <input
                        id={`${id}-email`}
                        type="email"
                        className="sk-input"
                        placeholder={t('loginPage.emailExample')}
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div className="sk-field">
                    <label htmlFor={`${id}-password`}>{t('loginPage.passwordPlaceholder')}</label>
                    <input
                        id={`${id}-password`}
                        type="password"
                        className="sk-input"
                        autoComplete={formMode === 'login' ? 'current-password' : 'new-password'}
                        minLength={formMode === 'register' ? PASSWORD_MIN : undefined}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    {formMode === 'register' && (
                        <span className="sk-field__hint">
                            {t('loginPage.passwordHint', { min: PASSWORD_MIN })}
                        </span>
                    )}
                </div>
                <button type="submit" className="sk-btn sk-btn--inverse" disabled={!canSubmit}>
                    {loading
                        ? t('loginPage.working')
                        : t(
                              formMode === 'login'
                                  ? 'loginPage.submitLogin'
                                  : 'loginPage.submitRegister',
                          )}
                </button>
            </form>
            {error && <div className="error">{errorMessage(t, error)}</div>}
        </>
    );
}
