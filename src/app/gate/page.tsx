'use client';

import { useId, useState } from 'react';
import { Credits } from '@/components/Credits';
import { useI18n } from '@/components/LanguageProvider';
import { Logo } from '@/components/Logo';
import { errorMessage } from '@/lib/i18n';

export default function GatePage() {
    const { t } = useI18n();
    const id = useId();
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/gate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                // data.error is a code; localize at render.
                throw new Error(data.error ?? 'gate_failed');
            }
            window.location.href = '/';
        } catch (err) {
            setError(err instanceof Error ? err.message : 'generic');
            setLoading(false);
        }
    }

    // Outside the tab group: no bottom nav, the same header and screen pieces.
    return (
        <div className="gate">
            <header className="pick-head">
                <Logo />
            </header>
            <main className="screen">
                <header className="screen-head">
                    <h1 className="screen-title">{t('gate.title')}</h1>
                </header>
                <p className="screen-note">{t('gate.subtitle')}</p>
                <section className="panel login-card">
                    <form onSubmit={submit} className="sk-form">
                        <div className="sk-field">
                            <label htmlFor={`${id}-password`}>{t('gate.password')}</label>
                            <input
                                id={`${id}-password`}
                                type="password"
                                className="sk-input"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <button
                            type="submit"
                            className="sk-btn sk-btn--primary"
                            disabled={loading || !password}
                        >
                            {loading ? t('gate.checking') : t('gate.enter')}
                        </button>
                    </form>
                </section>
                {error && <div className="error">{errorMessage(t, error)}</div>}
                <Credits />
            </main>
        </div>
    );
}
