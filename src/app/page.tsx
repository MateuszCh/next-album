'use client';

import { useCallback, useEffect, useState } from 'react';
import { LoginButton } from '@/components/LoginButton';
import { ModeSlider } from '@/components/ModeSlider';
import { FlowToggle, type FlowMode } from '@/components/FlowToggle';
import { GenrePicker } from '@/components/GenrePicker';
import { AlbumCard } from '@/components/AlbumCard';
import { HistoryPanel } from '@/components/HistoryPanel';
import { Logo, LogoMark } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useI18n } from '@/components/LanguageProvider';
import { errorMessage } from '@/lib/i18n';
import { GENRES } from '@/lib/recommend/genres';
import { MOODS } from '@/lib/recommend/moods';
import { DECADES } from '@/lib/recommend/decades';
import { getHistory, getSaved, pushHistory, toggleSaved } from '@/lib/history';
import type { AlbumRecommendation } from '@/lib/lastfm/types';

interface Me {
    loggedIn: boolean;
    username?: string;
    imageUrl?: string | null;
    gateEnabled?: boolean;
}

type TagDimension = 'genre' | 'mood' | 'decade';

const FLOW_MODES: FlowMode[] = ['surprise', 'genre', 'mood', 'decade', 'current'];

// Picker config per tag dimension — the curated list and its placeholder key.
const PICKERS: Record<TagDimension, { items: { tag: string; label: string }[]; placeholder: string }> = {
    genre: { items: GENRES, placeholder: 'genre.placeholder' },
    mood: { items: MOODS, placeholder: 'mood.placeholder' },
    decade: { items: DECADES, placeholder: 'decade.placeholder' },
};

export default function Home() {
    const { t } = useI18n();
    const [me, setMe] = useState<Me | null>(null);
    const [discovery, setDiscovery] = useState(0.5);
    const [flowMode, setFlowMode] = useState<FlowMode>('surprise');
    const [selected, setSelected] = useState<Record<TagDimension, string | null>>({
        genre: null,
        mood: null,
        decade: null,
    });
    const [album, setAlbum] = useState<AlbumRecommendation | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<AlbumRecommendation[]>([]);
    const [saved, setSaved] = useState<AlbumRecommendation[]>([]);

    useEffect(() => {
        fetch('/api/me')
            .then((r) => r.json())
            .then((data: Me) => setMe(data))
            .catch(() => setMe({ loggedIn: false }));

        const stored = window.localStorage.getItem('discovery');
        if (stored !== null) {
            const value = Number(stored);
            if (Number.isFinite(value)) setDiscovery(Math.min(1, Math.max(0, value)));
        }

        const storedAlbum = window.localStorage.getItem('lastAlbum');
        if (storedAlbum) {
            try {
                setAlbum(JSON.parse(storedAlbum) as AlbumRecommendation);
            } catch {
                window.localStorage.removeItem('lastAlbum');
            }
        }

        const storedFlow = window.localStorage.getItem('flowMode');
        if (storedFlow && (FLOW_MODES as string[]).includes(storedFlow)) {
            setFlowMode(storedFlow as FlowMode);
        }
        setSelected({
            genre: window.localStorage.getItem('genre'),
            mood: window.localStorage.getItem('mood'),
            decade: window.localStorage.getItem('decade'),
        });

        setHistory(getHistory());
        setSaved(getSaved());

        const params = new URLSearchParams(window.location.search);
        const err = params.get('error');
        if (err) {
            // Store the error *code*; it's localized at render time so it follows
            // a language switch.
            setError(err);
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    const handleDiscoveryChange = useCallback((value: number) => {
        setDiscovery(value);
        window.localStorage.setItem('discovery', String(value));
    }, []);

    const roll = useCallback(
        async (opts?: { dimension?: string; tag?: string }) => {
            setLoading(true);
            setError(null);
            try {
                const params = new URLSearchParams({ discovery: String(discovery) });
                if (opts?.dimension) params.set('dimension', opts.dimension);
                if (opts?.tag) params.set('tag', opts.tag);
                const res = await fetch(`/api/recommend?${params.toString()}`);
                const data = await res.json();
                // On error `data.error` is a code; store it and localize at render.
                if (!res.ok) throw new Error(data.error ?? 'generic');
                setAlbum(data as AlbumRecommendation);
                window.localStorage.setItem('lastAlbum', JSON.stringify(data));
                pushHistory(data as AlbumRecommendation);
                setHistory(getHistory());
            } catch (e) {
                setError(e instanceof Error ? e.message : 'generic');
            } finally {
                setLoading(false);
            }
        },
        [discovery],
    );

    const handleFlowModeChange = useCallback((mode: FlowMode) => {
        setFlowMode(mode);
        window.localStorage.setItem('flowMode', mode);
    }, []);

    const handlePickTag = useCallback(
        (dimension: TagDimension, tag: string) => {
            setSelected((s) => ({ ...s, [dimension]: tag }));
            window.localStorage.setItem(dimension, tag);
            roll({ dimension, tag });
        },
        [roll],
    );

    const showAlbum = useCallback((picked: AlbumRecommendation) => {
        setAlbum(picked);
        setError(null);
        window.localStorage.setItem('lastAlbum', JSON.stringify(picked));
    }, []);

    const removeSaved = useCallback((picked: AlbumRecommendation) => {
        toggleSaved(picked);
        setSaved(getSaved());
    }, []);

    const logout = useCallback(async () => {
        // Log out of Last.fm only — the gate stays unlocked. Full navigation so the
        // logged-out state (login screen) is rendered fresh.
        await fetch('/api/auth/logout', { method: 'POST' });
        window.localStorage.removeItem('lastAlbum');
        window.location.href = '/';
    }, []);

    const lock = useCallback(async () => {
        // Re-lock the app — clear the gate cookie but keep the Last.fm session. Full
        // navigation so middleware re-checks the gate and redirects to /gate.
        await fetch('/api/gate', { method: 'DELETE' });
        window.location.href = '/';
    }, []);

    const isPickerMode = flowMode === 'genre' || flowMode === 'mood' || flowMode === 'decade';

    return (
        <main className="page">
            <div className="topbar">
                <Logo />
                <div className="topbar-actions">
                    {me && (me.loggedIn || me.gateEnabled) && (
                        <div className="user-chip">
                            {me.loggedIn && me.imageUrl && <img src={me.imageUrl} alt="" />}
                            {me.loggedIn && <span>{me.username}</span>}
                            {me.gateEnabled && (
                                <button className="btn btn-ghost" onClick={lock}>
                                    {t('btn.lock')}
                                </button>
                            )}
                            {me.loggedIn && (
                                <button className="btn btn-ghost" onClick={logout}>
                                    {t('btn.logout')}
                                </button>
                            )}
                        </div>
                    )}
                    <div className="topbar-toggles">
                        <ThemeToggle />
                        <LanguageToggle />
                    </div>
                </div>
            </div>

            <div className="container">
                {me === null ? (
                    <p className="subtitle">{t('loading')}</p>
                ) : !me.loggedIn ? (
                    <div className="hero">
                        <span className="hero-mark">
                            <LogoMark />
                        </span>
                        <h1 className="title">{t('loggedOut.title')}</h1>
                        <p className="subtitle">{t('loggedOut.subtitle')}</p>
                        <LoginButton />
                        {error && <div className="error">{errorMessage(t, error)}</div>}
                    </div>
                ) : (
                    <>
                        <h1 className="title">{t('loggedIn.title', { username: me.username ?? '' })}</h1>
                        <p className="subtitle">{t('loggedIn.subtitle')}</p>

                        <div className="controls">
                            <FlowToggle
                                value={flowMode}
                                onChange={handleFlowModeChange}
                                disabled={loading}
                            />
                            <ModeSlider
                                value={discovery}
                                onChange={handleDiscoveryChange}
                                disabled={loading}
                            />
                            {isPickerMode ? (
                                <GenrePicker
                                    items={PICKERS[flowMode].items}
                                    selected={selected[flowMode]}
                                    placeholder={t(PICKERS[flowMode].placeholder)}
                                    onPick={(tag) => handlePickTag(flowMode, tag)}
                                    disabled={loading}
                                />
                            ) : (
                                <button
                                    className="btn btn-primary btn-big"
                                    onClick={() =>
                                        roll(flowMode === 'current' ? { dimension: 'current' } : undefined)
                                    }
                                    disabled={loading}
                                >
                                    {loading ? t('btn.rolling') : t('btn.next')}
                                </button>
                            )}
                        </div>

                        {error && <div className="error">{errorMessage(t, error)}</div>}
                        {album && <AlbumCard album={album} onSavedChange={() => setSaved(getSaved())} />}
                        {!album && !error && <p className="hint">{t(`hint.${flowMode}`)}</p>}

                        <HistoryPanel
                            history={history}
                            saved={saved}
                            onPick={showAlbum}
                            onRemoveSaved={removeSaved}
                        />
                    </>
                )}
            </div>

            <footer className="footer">
                <a href="https://www.last.fm/" target="_blank" rel="noreferrer">
                    {t('footer.poweredBy')}
                </a>
            </footer>
        </main>
    );
}
