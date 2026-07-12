'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { LoginButton } from '@/components/LoginButton';
import { ModeSlider } from '@/components/ModeSlider';
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
import {
    albumKey,
    fetchUserData,
    isSaved,
    pushHistory,
    removeSaved as removeSavedRemote,
    setLastAlbum,
    toggleSaved,
} from '@/lib/history';
import type { AlbumRecommendation } from '@/lib/lastfm/types';

interface Me {
    loggedIn: boolean;
    username?: string;
    imageUrl?: string | null;
    gateEnabled?: boolean;
}

type TagDimension = 'genre' | 'mood' | 'decade';

const DIMENSIONS: TagDimension[] = ['genre', 'mood', 'decade'];

// Picker config per tag dimension — the curated list and its placeholder key.
// `labelKey` (when set) builds an i18n key per item (`<labelKey>.<tag>`) so the
// labels are translated; genres and decades stay as their proper-noun labels.
const PICKERS: Record<
    TagDimension,
    { items: { tag: string; label: string }[]; placeholder: string; labelKey?: string }
> = {
    genre: { items: GENRES, placeholder: 'genre.placeholder' },
    mood: { items: MOODS, placeholder: 'mood.placeholder', labelKey: 'mood' },
    decade: { items: DECADES, placeholder: 'decade.placeholder' },
};

type Filters = Record<TagDimension, string[]>;

// Read a stored filter list, tolerating the legacy single-value string format.
function readStoredTags(key: string): string[] {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === 'string');
    } catch {
        // legacy value was a bare tag string
    }
    return [raw];
}

export default function Home() {
    const { t } = useI18n();
    const [me, setMe] = useState<Me | null>(null);
    const [discovery, setDiscovery] = useState(0.5);
    const [filters, setFilters] = useState<Filters>({ genre: [], mood: [], decade: [] });
    const [now, setNow] = useState(false);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [album, setAlbum] = useState<AlbumRecommendation | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<AlbumRecommendation[]>([]);
    const [saved, setSaved] = useState<AlbumRecommendation[]>([]);
    // Monotonic id for the latest roll; an older in-flight response whose id no
    // longer matches is ignored so it can't overwrite a newer album.
    const rollId = useRef(0);

    useEffect(() => {
        fetch('/api/me')
            .then((r) => r.json())
            .then((data: Me) => {
                setMe(data);
                // Load the user's stored data (last album, history, saved) from the
                // DB only once we know they're logged in.
                if (data.loggedIn) {
                    fetchUserData().then((ud) => {
                        if (ud.lastAlbum) setAlbum(ud.lastAlbum);
                        setHistory(ud.history);
                        setSaved(ud.saved);
                    });
                }
            })
            .catch(() => setMe({ loggedIn: false }));

        const stored = window.localStorage.getItem('discovery');
        if (stored !== null) {
            const value = Number(stored);
            if (Number.isFinite(value)) setDiscovery(Math.min(1, Math.max(0, value)));
        }

        setFilters({
            genre: readStoredTags('genre'),
            mood: readStoredTags('mood'),
            decade: readStoredTags('decade'),
        });
        setNow(window.localStorage.getItem('now') === '1');
        setFiltersOpen(window.localStorage.getItem('filtersOpen') === '1');

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

    const roll = useCallback(async () => {
        const id = ++rollId.current;
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ discovery: String(discovery) });
            filters.genre.forEach((g) => params.append('genre', g));
            filters.mood.forEach((m) => params.append('mood', m));
            filters.decade.forEach((d) => params.append('decade', d));
            if (now) params.set('now', '1');
            const res = await fetch(`/api/recommend?${params.toString()}`);
            const data = await res.json();
            // A newer roll superseded this one — ignore the stale response.
            if (id !== rollId.current) return;
            // On error `data.error` is a code; store it and localize at render.
            if (!res.ok) throw new Error(data.error ?? 'generic');
            setAlbum(data as AlbumRecommendation);
            const nextHistory = await pushHistory(data as AlbumRecommendation);
            if (nextHistory) setHistory(nextHistory);
        } catch (e) {
            if (id !== rollId.current) return;
            setError(e instanceof Error ? e.message : 'generic');
        } finally {
            if (id === rollId.current) setLoading(false);
        }
    }, [discovery, filters, now]);

    const handleToggleTag = useCallback((dimension: TagDimension, tag: string) => {
        setFilters((f) => {
            const current = f[dimension];
            const next = current.includes(tag)
                ? current.filter((x) => x !== tag)
                : [...current, tag];
            window.localStorage.setItem(dimension, JSON.stringify(next));
            return { ...f, [dimension]: next };
        });
    }, []);

    const handleToggleFilters = useCallback(() => {
        setFiltersOpen((o) => {
            const next = !o;
            window.localStorage.setItem('filtersOpen', next ? '1' : '0');
            return next;
        });
    }, []);

    const handleResetFilters = useCallback(() => {
        setFilters({ genre: [], mood: [], decade: [] });
        setNow(false);
        window.localStorage.removeItem('genre');
        window.localStorage.removeItem('mood');
        window.localStorage.removeItem('decade');
        window.localStorage.removeItem('now');
    }, []);

    const handleToggleNow = useCallback(() => {
        setNow((n) => {
            const next = !n;
            window.localStorage.setItem('now', next ? '1' : '0');
            return next;
        });
    }, []);

    const showAlbum = useCallback((picked: AlbumRecommendation) => {
        setAlbum(picked);
        setError(null);
        setLastAlbum(picked);
    }, []);

    // Toggle the shown album in/out of saved. Optimistic: update local state
    // immediately, then reconcile with the server's authoritative list.
    const toggleSave = useCallback((picked: AlbumRecommendation) => {
        const key = albumKey(picked);
        setSaved((current) =>
            current.some((a) => albumKey(a) === key)
                ? current.filter((a) => albumKey(a) !== key)
                : [picked, ...current],
        );
        toggleSaved(picked).then((res) => {
            if (res) setSaved(res.saved);
        });
    }, []);

    const removeSaved = useCallback((picked: AlbumRecommendation) => {
        const key = albumKey(picked);
        setSaved((current) => current.filter((a) => albumKey(a) !== key));
        removeSavedRemote(picked).then((next) => {
            if (next) setSaved(next);
        });
    }, []);

    const logout = useCallback(async () => {
        // Log out of Last.fm only — the gate stays unlocked. Full navigation so the
        // logged-out state (login screen) is rendered fresh.
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/';
    }, []);

    const lock = useCallback(async () => {
        // Re-lock the app — clear the gate cookie but keep the Last.fm session. Full
        // navigation so middleware re-checks the gate and redirects to /gate.
        await fetch('/api/gate', { method: 'DELETE' });
        window.location.href = '/';
    }, []);

    // Translate a picker's labels when the dimension opts in (moods).
    const pickerItems = useCallback(
        (dimension: TagDimension) => {
            const cfg = PICKERS[dimension];
            return cfg.labelKey
                ? cfg.items.map((item) => ({ ...item, label: t(`${cfg.labelKey}.${item.tag}`) }))
                : cfg.items;
        },
        [t],
    );

    const activeFilterCount =
        filters.genre.length + filters.mood.length + filters.decade.length + (now ? 1 : 0);

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
                            <ModeSlider
                                value={discovery}
                                onChange={handleDiscoveryChange}
                                disabled={loading}
                            />

                            <div className="filters-header">
                                <button
                                    type="button"
                                    className="filters-toggle"
                                    onClick={handleToggleFilters}
                                    aria-expanded={filtersOpen}
                                    aria-controls="filters-panel"
                                >
                                    <span>
                                        {t(filtersOpen ? 'filter.hide' : 'filter.show')}
                                        {activeFilterCount > 0 && (
                                            <span className="filters-badge">{activeFilterCount}</span>
                                        )}
                                    </span>
                                    <svg
                                        className={`filters-chevron${filtersOpen ? ' open' : ''}`}
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        aria-hidden
                                    >
                                        <path
                                            d="M6 9l6 6 6-6"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </button>
                                {activeFilterCount > 0 && (
                                    <button
                                        type="button"
                                        className="filters-reset"
                                        onClick={handleResetFilters}
                                        disabled={loading}
                                    >
                                        {t('filter.reset')}
                                    </button>
                                )}
                            </div>

                            {filtersOpen && (
                            <div className="filters" id="filters-panel">
                                {DIMENSIONS.map((dim) => (
                                    <div className="filter-group" key={dim}>
                                        <span className="filter-label">{t(`filter.${dim}`)}</span>
                                        <GenrePicker
                                            items={pickerItems(dim)}
                                            selected={filters[dim]}
                                            placeholder={t(PICKERS[dim].placeholder)}
                                            onToggle={(tag) => handleToggleTag(dim, tag)}
                                            disabled={loading}
                                        />
                                    </div>
                                ))}

                                <div className="filter-group filter-now">
                                    <button
                                        type="button"
                                        className={`genre-chip now-chip${now ? ' selected' : ''}`}
                                        aria-pressed={now}
                                        onClick={handleToggleNow}
                                        disabled={loading}
                                        title={t('filter.now.hint')}
                                    >
                                        {t('filter.now')}
                                    </button>
                                </div>
                            </div>
                            )}

                            <button
                                className="btn btn-primary btn-big"
                                onClick={() => roll()}
                                disabled={loading}
                            >
                                {loading ? t('btn.rolling') : t('btn.next')}
                            </button>
                        </div>

                        {error && <div className="error">{errorMessage(t, error)}</div>}
                        {album && (
                            <AlbumCard
                                key={albumKey(album)}
                                album={album}
                                saved={isSaved(saved, album)}
                                onToggleSave={() => toggleSave(album)}
                            />
                        )}
                        {!album && !error && <p className="hint">{t('hint.default')}</p>}

                        <HistoryPanel
                            history={history}
                            saved={saved}
                            onPick={showAlbum}
                            onToggleSave={toggleSave}
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
