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
import { DECADES } from '@/lib/recommend/decades';
import { COUNTRIES } from '@/lib/recommend/countries';
import { albumKey, guestStore, isSaved, mergeGuestData, remoteStore } from '@/lib/history';
import type { AlbumRecommendation } from '@/lib/lastfm/types';

interface Me {
    loggedIn: boolean;
    // Set for a Last.fm login or an email account with Last.fm linked.
    lastfmUsername?: string | null;
    email?: string | null;
    imageUrl?: string | null;
    gateEnabled?: boolean;
}

// `lastfm`: picks from the user's Last.fm profile (slider, no filters).
// `search`: Discogs album search by filters — no Last.fm account needed.
type AppMode = 'lastfm' | 'search';

const APP_MODES: AppMode[] = ['lastfm', 'search'];

type TagDimension = 'genre' | 'decade' | 'country';

const DIMENSIONS: TagDimension[] = ['genre', 'decade', 'country'];

// Picker config per tag dimension — the curated list and its placeholder key.
// `labelKey` (when set) builds an i18n key per item (`<labelKey>.<tag>`) so the
// labels are translated; genres and decades stay as their proper-noun labels.
const PICKERS: Record<
    TagDimension,
    { items: { tag: string; label: string }[]; placeholder: string; labelKey?: string }
> = {
    genre: { items: GENRES, placeholder: 'genre.placeholder' },
    decade: { items: DECADES, placeholder: 'decade.placeholder' },
    country: { items: COUNTRIES, placeholder: 'country.placeholder', labelKey: 'country' },
};

type Filters = Record<TagDimension, string[]>;

const NO_FILTERS: Filters = { genre: [], decade: [], country: [] };

// Read a stored filter list, tolerating the legacy single-value string format
// and dropping tags no longer offered (e.g. removed countries).
function readStoredTags(dimension: TagDimension): string[] {
    const raw = window.localStorage.getItem(dimension);
    if (!raw) return [];
    let tags = [raw]; // legacy value was a bare tag string
    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) tags = parsed.filter((x): x is string => typeof x === 'string');
    } catch {
        // keep the bare string
    }
    return tags.filter((tag) => PICKERS[dimension].items.some((item) => item.tag === tag));
}

export default function Home() {
    const { t } = useI18n();
    const [me, setMe] = useState<Me | null>(null);
    const [mode, setMode] = useState<AppMode>('lastfm');
    const [discovery, setDiscovery] = useState(0.5);
    const [filters, setFilters] = useState<Filters>(NO_FILTERS);
    const [album, setAlbum] = useState<AlbumRecommendation | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<AlbumRecommendation[]>([]);
    const [saved, setSaved] = useState<AlbumRecommendation[]>([]);
    // Monotonic id for the latest roll; an older in-flight response whose id no
    // longer matches is ignored so it can't overwrite a newer album.
    const rollId = useRef(0);

    const loggedIn = me?.loggedIn ?? false;
    // The Last.fm mode needs a Last.fm username, not just any account.
    const hasLastfm = Boolean(me?.lastfmUsername);
    // Logged in: the account's data (MongoDB); logged out: this browser's localStorage.
    const store = loggedIn ? remoteStore : guestStore;

    useEffect(() => {
        fetch('/api/me')
            .then((r) => r.json())
            .then((data: Me) => {
                setMe(data);
                // A remembered mode wins; otherwise Last.fm users start in the
                // Last.fm mode and everyone else in the search (no Last.fm needed).
                const storedMode = window.localStorage.getItem('appMode') as AppMode | null;
                setMode(
                    storedMode && APP_MODES.includes(storedMode)
                        ? storedMode
                        : data.lastfmUsername
                          ? 'lastfm'
                          : 'search',
                );
                // Logged in: first fold any guest (localStorage) data into the
                // account, then load the account's data. Logged out: the guest data.
                const load = data.loggedIn
                    ? mergeGuestData().then((merged) => merged ?? remoteStore.fetch())
                    : guestStore.fetch();
                load.then((ud) => {
                    if (ud.lastAlbum) setAlbum(ud.lastAlbum);
                    setHistory(ud.history);
                    setSaved(ud.saved);
                });
            })
            .catch(() => {
                setMe({ loggedIn: false });
                setMode('search');
            });

        const stored = window.localStorage.getItem('discovery');
        if (stored !== null) {
            const value = Number(stored);
            if (Number.isFinite(value)) setDiscovery(Math.min(1, Math.max(0, value)));
        }

        setFilters({
            genre: readStoredTags('genre'),
            decade: readStoredTags('decade'),
            country: readStoredTags('country'),
        });

        const params = new URLSearchParams(window.location.search);
        const err = params.get('error');
        if (err) {
            // Store the error *code*; it's localized at render time so it follows
            // a language switch.
            setError(err);
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    const handleModeChange = useCallback((next: AppMode) => {
        setMode(next);
        setError(null);
        window.localStorage.setItem('appMode', next);
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
            let url: string;
            if (mode === 'lastfm') {
                url = `/api/recommend?${new URLSearchParams({ discovery: String(discovery) })}`;
            } else {
                const params = new URLSearchParams();
                DIMENSIONS.forEach((dim) => filters[dim].forEach((tag) => params.append(dim, tag)));
                url = `/api/search?${params}`;
            }
            const res = await fetch(url);
            const data = await res.json();
            // A newer roll superseded this one — ignore the stale response.
            if (id !== rollId.current) return;
            // On error `data.error` is a code; store it and localize at render.
            if (!res.ok) throw new Error(data.error ?? 'generic');
            setAlbum(data as AlbumRecommendation);
            const nextHistory = await store.push(data as AlbumRecommendation);
            if (nextHistory) setHistory(nextHistory);
        } catch (e) {
            if (id !== rollId.current) return;
            setError(e instanceof Error ? e.message : 'generic');
        } finally {
            if (id === rollId.current) setLoading(false);
        }
    }, [mode, discovery, filters, store]);

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

    const handleResetFilters = useCallback(() => {
        setFilters(NO_FILTERS);
        DIMENSIONS.forEach((dim) => window.localStorage.removeItem(dim));
    }, []);

    const showAlbum = useCallback(
        (picked: AlbumRecommendation) => {
            setAlbum(picked);
            setError(null);
            store.setLast(picked);
        },
        [store],
    );

    // Toggle the shown album in/out of saved. Optimistic: update local state
    // immediately, then reconcile with the store's authoritative list.
    const toggleSave = useCallback(
        (picked: AlbumRecommendation) => {
            const key = albumKey(picked);
            setSaved((current) =>
                current.some((a) => albumKey(a) === key)
                    ? current.filter((a) => albumKey(a) !== key)
                    : [picked, ...current],
            );
            store.toggleSaved(picked).then((res) => {
                if (res) setSaved(res.saved);
            });
        },
        [store],
    );

    const removeSaved = useCallback(
        (picked: AlbumRecommendation) => {
            const key = albumKey(picked);
            setSaved((current) => current.filter((a) => albumKey(a) !== key));
            store.removeSaved(picked).then((next) => {
                if (next) setSaved(next);
            });
        },
        [store],
    );

    const logout = useCallback(async () => {
        // Log out of the account only — the gate stays unlocked. Full navigation so
        // the logged-out state (guest data, login screen) is rendered fresh.
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/';
    }, []);

    const lock = useCallback(async () => {
        // Re-lock the app — clear the gate cookie but keep the Last.fm session. Full
        // navigation so middleware re-checks the gate and redirects to /gate.
        await fetch('/api/gate', { method: 'DELETE' });
        window.location.href = '/';
    }, []);

    // Translate a picker's labels when the dimension opts in (countries).
    const pickerItems = useCallback(
        (dimension: TagDimension) => {
            const cfg = PICKERS[dimension];
            return cfg.labelKey
                ? cfg.items.map((item) => ({ ...item, label: t(`${cfg.labelKey}.${item.tag}`) }))
                : cfg.items;
        },
        [t],
    );

    const activeFilterCount = DIMENSIONS.reduce((n, dim) => n + filters[dim].length, 0);

    // The Last.fm mode needs Last.fm: logged out it shows the login screen, and an
    // email account without Last.fm gets the same screen to connect it.
    const showLogin = mode === 'lastfm' && !hasLastfm;
    const displayName = me?.lastfmUsername ?? me?.email ?? '';

    return (
        <main className="page">
            <div className="topbar">
                <Logo />
                <div className="topbar-actions">
                    {me && (
                        <div className="user-chip">
                            {me.loggedIn && me.imageUrl && <img src={me.imageUrl} alt="" />}
                            {me.loggedIn && <span>{displayName}</span>}
                            {me.gateEnabled && (
                                <button className="btn btn-ghost" onClick={lock}>
                                    {t('btn.lock')}
                                </button>
                            )}
                            {me.loggedIn ? (
                                <button className="btn btn-ghost" onClick={logout}>
                                    {t('btn.logout')}
                                </button>
                            ) : (
                                <a className="btn btn-ghost" href="/login">
                                    {t('btn.loginPage')}
                                </a>
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
                ) : (
                    <>
                        <div className="mode-tabs" role="tablist" aria-label={t('mode.aria')}>
                            {APP_MODES.map((m) => (
                                <button
                                    key={m}
                                    role="tab"
                                    aria-selected={mode === m}
                                    className={mode === m ? 'active' : ''}
                                    onClick={() => handleModeChange(m)}
                                    disabled={loading}
                                >
                                    {t(`mode.${m}`)}
                                </button>
                            ))}
                        </div>

                        {showLogin ? (
                            <div className="hero">
                                <span className="hero-mark">
                                    <LogoMark />
                                </span>
                                {loggedIn ? (
                                    <>
                                        <h1 className="title">{t('link.title')}</h1>
                                        <p className="subtitle">{t('link.subtitle')}</p>
                                        <LoginButton link />
                                    </>
                                ) : (
                                    <>
                                        <h1 className="title">{t('loggedOut.title')}</h1>
                                        <p className="subtitle">{t('loggedOut.subtitle')}</p>
                                        <LoginButton />
                                    </>
                                )}
                                {error && <div className="error">{errorMessage(t, error)}</div>}
                            </div>
                        ) : (
                            <>
                                {mode === 'lastfm' ? (
                                    <>
                                        <h1 className="title">
                                            {t('loggedIn.title', { username: displayName })}
                                        </h1>
                                        <p className="subtitle">{t('loggedIn.subtitle')}</p>
                                    </>
                                ) : (
                                    <>
                                        <h1 className="title">{t('search.title')}</h1>
                                        <p className="subtitle">{t('search.subtitle')}</p>
                                    </>
                                )}

                                <div className="controls">
                                    {mode === 'lastfm' ? (
                                        <ModeSlider
                                            value={discovery}
                                            onChange={handleDiscoveryChange}
                                            disabled={loading}
                                        />
                                    ) : (
                                        <div className="filters">
                                            {DIMENSIONS.map((dim) => (
                                                <div className="filter-group" key={dim}>
                                                    <span className="filter-label">
                                                        {t(`filter.${dim}`)}
                                                    </span>
                                                    <GenrePicker
                                                        items={pickerItems(dim)}
                                                        selected={filters[dim]}
                                                        placeholder={t(PICKERS[dim].placeholder)}
                                                        onToggle={(tag) =>
                                                            handleToggleTag(dim, tag)
                                                        }
                                                        disabled={loading}
                                                    />
                                                </div>
                                            ))}
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
                                {!album && !error && (
                                    <p className="hint">
                                        {t(mode === 'lastfm' ? 'hint.default' : 'hint.search')}
                                    </p>
                                )}

                                <HistoryPanel
                                    history={history}
                                    saved={saved}
                                    onPick={showAlbum}
                                    onToggleSave={toggleSave}
                                    onRemoveSaved={removeSaved}
                                />
                            </>
                        )}
                    </>
                )}
            </div>

            <footer className="footer">
                <a href="https://www.last.fm/" target="_blank" rel="noreferrer">
                    {t('footer.poweredBy')}
                </a>
                <a href="https://www.discogs.com/" target="_blank" rel="noreferrer">
                    {t('footer.discogs')}
                </a>
            </footer>
        </main>
    );
}
