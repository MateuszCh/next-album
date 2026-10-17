'use client';

import { useEffect, useState } from 'react';
import { LoginButton } from '@/components/LoginButton';
import { Logo, LogoMark } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useI18n } from '@/components/LanguageProvider';
import { errorMessage } from '@/lib/i18n';

type FormMode = 'login' | 'register';

// Must match PASSWORD_MIN in src/lib/accounts.ts (the server re-checks it).
const PASSWORD_MIN = 8;

/** Two ways in: a Last.fm login, or an email + password account. */
export default function LoginPage() {
    const { t } = useI18n();
    const [formMode, setFormMode] = useState<FormMode>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Already logged in → nothing to do here.
    useEffect(() => {
        fetch('/api/me')
            .then((r) => r.json())
            .then((data: { loggedIn?: boolean }) => {
                if (data.loggedIn) window.location.replace('/');
            })
            .catch(() => {});
    }, []);

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
            // The home page merges this browser's guest history/saved into the account.
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
        <main className="page">
            <div className="topbar">
                <a href="/" className="login-home" aria-label={t('loginPage.home')}>
                    <Logo />
                </a>
                <div className="topbar-actions">
                    <a href="/" className="btn btn-ghost">
                        ← {t('loginPage.back')}
                    </a>
                    <div className="topbar-toggles">
                        <ThemeToggle />
                        <LanguageToggle />
                    </div>
                </div>
            </div>

            <div className="container">
                <div className="hero">
                    <span className="hero-mark">
                        <LogoMark />
                    </span>
                    <h1 className="title">{t('loginPage.title')}</h1>
                    <p className="subtitle">{t('loginPage.subtitle')}</p>
                </div>

                <section className="login-section">
                    <h2 className="login-heading">{t('loginPage.lastfm')}</h2>
                    <p className="login-note">{t('loginPage.lastfmNote')}</p>
                    <LoginButton />
                </section>

                <div className="login-divider">
                    <span>{t('loginPage.or')}</span>
                </div>

                <section className="login-section">
                    <h2 className="login-heading">{t('loginPage.email')}</h2>
                    <div className="mode-tabs" role="tablist" aria-label={t('loginPage.email')}>
                        {(['login', 'register'] as FormMode[]).map((m) => (
                            <button
                                key={m}
                                type="button"
                                role="tab"
                                aria-selected={formMode === m}
                                className={formMode === m ? 'active' : ''}
                                onClick={() => switchMode(m)}
                                disabled={loading}
                            >
                                {t(`loginPage.tab.${m}`)}
                            </button>
                        ))}
                    </div>
                    <form onSubmit={submit} className="gate-form login-form">
                        <input
                            type="email"
                            className="gate-input"
                            placeholder={t('loginPage.emailPlaceholder')}
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <input
                            type="password"
                            className="gate-input"
                            placeholder={t('loginPage.passwordPlaceholder')}
                            autoComplete={
                                formMode === 'login' ? 'current-password' : 'new-password'
                            }
                            minLength={formMode === 'register' ? PASSWORD_MIN : undefined}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        {formMode === 'register' && (
                            <p className="login-note">
                                {t('loginPage.passwordHint', { min: PASSWORD_MIN })}
                            </p>
                        )}
                        <button
                            type="submit"
                            className="btn btn-primary btn-big"
                            disabled={!canSubmit}
                        >
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
                </section>

                <div className="login-skip">
                    <a href="/" className="btn btn-ghost">
                        {t('loginPage.skip')}
                    </a>
                    <p className="login-note">{t('loginPage.skipNote')}</p>
                </div>
            </div>

            <footer className="footer">
                <a href="https://www.last.fm/" target="_blank" rel="noreferrer">
                    {t('footer.poweredBy')}
                </a>
            </footer>
        </main>
    );
}
