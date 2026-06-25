'use client';

import { useState } from 'react';
import { useI18n } from '@/components/LanguageProvider';
import { errorMessage } from '@/lib/i18n';

export default function GatePage() {
    const { t } = useI18n();
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

    return (
        <main className="page">
            <div className="container">
                <h1 className="title">{t('gate.title')}</h1>
                <p className="subtitle">{t('gate.subtitle')}</p>
                <form onSubmit={submit} className="gate-form">
                    <input
                        type="password"
                        className="gate-input"
                        placeholder={t('gate.placeholder')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoFocus
                    />
                    <button
                        type="submit"
                        className="btn btn-primary btn-big"
                        disabled={loading || !password}
                    >
                        {loading ? t('gate.checking') : t('gate.enter')}
                    </button>
                </form>
                {error && <div className="error">{errorMessage(t, error)}</div>}
            </div>

            <footer className="footer">
                <a href="https://www.last.fm/" target="_blank" rel="noreferrer">
                    {t('footer.poweredBy')}
                </a>
            </footer>
        </main>
    );
}
