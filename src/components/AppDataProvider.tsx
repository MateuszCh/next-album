'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { GENRES } from '@/lib/recommend/genres';
import { DECADES } from '@/lib/recommend/decades';
import { COUNTRIES } from '@/lib/recommend/countries';
import { albumKey, guestStore, mergeGuestData, remoteStore } from '@/lib/history';
import { canonicalLastfmImage, upgradeLastfmImage } from '@/lib/coverUrl';
import { APP_MODE_COOKIE, APP_MODES, parseAppMode, type AppMode } from '@/lib/appMode';
import type { AlbumRecommendation } from '@/lib/lastfm/types';

export { APP_MODES, type AppMode };

export interface Me {
    loggedIn: boolean;
    // Set for a Last.fm login or an email account with Last.fm linked.
    lastfmUsername?: string | null;
    email?: string | null;
    imageUrl?: string | null;
    gateEnabled?: boolean;
}

export type TagDimension = 'genre' | 'decade' | 'country';

export const DIMENSIONS: TagDimension[] = ['genre', 'decade', 'country'];

// Picker config per tag dimension — the curated list. `labelKey` (when set)
// builds an i18n key per item (`<labelKey>.<tag>`) so the labels are translated;
// genres and decades stay as their proper-noun labels.
export const PICKERS: Record<
    TagDimension,
    { items: { tag: string; label: string }[]; labelKey?: string }
> = {
    genre: { items: GENRES },
    decade: { items: DECADES },
    country: { items: COUNTRIES, labelKey: 'country' },
};

export type Filters = Record<TagDimension, string[]>;

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

function rollUrl(mode: AppMode, discovery: number, filters: Filters): string {
    if (mode === 'lastfm') {
        return `/api/recommend?${new URLSearchParams({ discovery: String(discovery) })}`;
    }
    const params = new URLSearchParams();
    DIMENSIONS.forEach((dim) => filters[dim].forEach((tag) => params.append(dim, tag)));
    return `/api/search?${params}`;
}

// A roll's response: the album, or an error code when the request failed.
type RollResponse =
    { ok: true; data: AlbumRecommendation } | { ok: false; data: { error?: string } };

async function fetchRoll(url: string): Promise<RollResponse> {
    const res = await fetch(url);
    return { ok: res.ok, data: await res.json() } as RollResponse;
}

function writeModeCookie(mode: AppMode): void {
    document.cookie = `${APP_MODE_COOKIE}=${mode}; path=/; max-age=31536000; samesite=lax`;
}

interface AppData {
    /** Seeded from the session by the server; `/api/me` later adds the avatar. */
    me: Me;
    /** Whether history, saved and the last album have loaded. */
    dataReady: boolean;
    mode: AppMode;
    setMode: (mode: AppMode) => void;
    discovery: number;
    setDiscovery: (value: number) => void;
    filters: Filters;
    toggleTag: (dimension: TagDimension, tag: string) => void;
    resetFilters: () => void;
    album: AlbumRecommendation | null;
    loading: boolean;
    /** Error *code* (localized at render, so it follows a language switch). */
    error: string | null;
    history: AlbumRecommendation[];
    saved: AlbumRecommendation[];
    roll: () => Promise<void>;
    showAlbum: (album: AlbumRecommendation) => void;
    toggleSave: (album: AlbumRecommendation) => void;
    removeSaved: (album: AlbumRecommendation) => void;
    logout: () => Promise<void>;
    lock: () => Promise<void>;
}

const Ctx = createContext<AppData | null>(null);

/**
 * The account, the shown album, history/saved and the pick preferences, shared
 * by every tab (Losuj, Historia, Ulubione, Konto) so switching tabs keeps them —
 * including a roll still in flight.
 */
export function AppDataProvider({
    initialMe,
    initialMode,
    children,
}: {
    initialMe: Me;
    /** The mode cookie; `null` when none is stored yet. */
    initialMode: AppMode | null;
    children: React.ReactNode;
}) {
    const [me, setMe] = useState<Me>(initialMe);
    // A remembered mode wins; otherwise Last.fm users start in the Last.fm mode
    // and everyone else in the search (no Last.fm needed).
    const [mode, setModeState] = useState<AppMode>(
        initialMode ?? (initialMe.lastfmUsername ? 'lastfm' : 'search'),
    );
    const [dataReady, setDataReady] = useState(false);
    const [discovery, setDiscoveryState] = useState(0.5);
    const [filters, setFilters] = useState<Filters>(NO_FILTERS);
    const [album, setAlbum] = useState<AlbumRecommendation | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<AlbumRecommendation[]>([]);
    const [saved, setSaved] = useState<AlbumRecommendation[]>([]);
    // Monotonic id for the latest roll; an older in-flight response whose id no
    // longer matches is ignored so it can't overwrite a newer album.
    const rollId = useRef(0);
    // The next roll, fetched in the background after one is shown so "roll
    // again" is instant. Keyed by URL and Last.fm user: a filter or slider
    // change, or another account, makes it stale.
    const prefetch = useRef<{ url: string; result: Promise<RollResponse | null> } | null>(null);

    // Logged in: the account's data (MongoDB); logged out: this browser's localStorage.
    const store = me.loggedIn ? remoteStore : guestStore;
    const initialLoggedIn = initialMe.loggedIn;

    useEffect(() => {
        // Logged in: first fold any guest (localStorage) data into the account,
        // then load the account's data. Logged out: the guest data.
        const load = initialLoggedIn
            ? mergeGuestData().then((merged) => merged ?? remoteStore.fetch())
            : guestStore.fetch();
        load.then((ud) => {
            // A roll made in the meantime wins over the stored last album.
            if (ud.lastAlbum) setAlbum((current) => current ?? ud.lastAlbum);
            setHistory(ud.history);
            setSaved(ud.saved);
        }).finally(() => setDataReady(true));

        // The avatar, and an email account's Last.fm link made on another device.
        fetch('/api/me')
            .then((r) => (r.ok ? (r.json() as Promise<Me>) : null))
            .then((data) => {
                if (data) setMe(data);
            })
            .catch(() => {
                // keep the session's view
            });

        // One-time migration for a mode still only in localStorage (before the cookie).
        if (initialMode === null) {
            const legacy = parseAppMode(window.localStorage.getItem('appMode'));
            if (legacy) {
                setModeState(legacy);
                writeModeCookie(legacy);
            }
            window.localStorage.removeItem('appMode');
        }

        const stored = window.localStorage.getItem('discovery');
        if (stored !== null) {
            const value = Number(stored);
            if (Number.isFinite(value)) setDiscoveryState(Math.min(1, Math.max(0, value)));
        }

        setFilters({
            genre: readStoredTags('genre'),
            decade: readStoredTags('decade'),
            country: readStoredTags('country'),
        });

        // Login callbacks redirect to `/?error=<code>`.
        const params = new URLSearchParams(window.location.search);
        const err = params.get('error');
        if (err) {
            setError(err);
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, [initialLoggedIn, initialMode]);

    const setMode = useCallback((next: AppMode) => {
        setModeState(next);
        setError(null);
        writeModeCookie(next);
    }, []);

    const setDiscovery = useCallback((value: number) => {
        setDiscoveryState(value);
        window.localStorage.setItem('discovery', String(value));
    }, []);

    const roll = useCallback(async () => {
        const id = ++rollId.current;
        setLoading(true);
        setError(null);
        try {
            const url = rollUrl(mode, discovery, filters);
            const prefetchKey = `${me.lastfmUsername ?? ''} ${url}`;
            const prefetched = prefetch.current;
            prefetch.current = null;
            let res: RollResponse | null = null;
            if (prefetched?.url === prefetchKey) {
                res = await prefetched.result;
                // A failed prefetch, or one repeating the shown album, is refetched.
                if (!res?.ok || (album && albumKey(res.data) === albumKey(album))) res = null;
            }
            res ??= await fetchRoll(url);
            // A newer roll superseded this one — ignore the stale response.
            if (id !== rollId.current) return;
            // On error `data.error` is a code; store it and localize at render.
            if (!res.ok) throw new Error(res.data.error ?? 'generic');
            const picked = res.data;
            setAlbum(picked);
            const nextHistory = await store.push(picked);
            if (nextHistory) setHistory(nextHistory);
            // Fetch the next pick in the background, once this one is in the
            // history the server excludes recent rolls by (For me), and warm its
            // cover in both sizes the card loads — the sharp one is a cold CDN
            // render of a few seconds, done while this album is on screen.
            if (id === rollId.current) {
                const result = fetchRoll(url).catch(() => null);
                prefetch.current = { url: prefetchKey, result };
                result.then((next) => {
                    if (!next?.ok || !next.data.imageUrl) return;
                    new Image().src = canonicalLastfmImage(next.data.imageUrl);
                    new Image().src = upgradeLastfmImage(next.data.imageUrl);
                });
            }
        } catch (e) {
            if (id !== rollId.current) return;
            setError(e instanceof Error ? e.message : 'generic');
        } finally {
            if (id === rollId.current) setLoading(false);
        }
    }, [mode, discovery, filters, store, album, me.lastfmUsername]);

    const toggleTag = useCallback((dimension: TagDimension, tag: string) => {
        setFilters((f) => {
            const current = f[dimension];
            const next = current.includes(tag)
                ? current.filter((x) => x !== tag)
                : [...current, tag];
            window.localStorage.setItem(dimension, JSON.stringify(next));
            return { ...f, [dimension]: next };
        });
    }, []);

    const resetFilters = useCallback(() => {
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

    // Toggle an album in/out of saved. Optimistic: update local state
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
        // Re-lock the app — clear the gate cookie but keep the account session. Full
        // navigation so middleware re-checks the gate and redirects to /gate.
        await fetch('/api/gate', { method: 'DELETE' });
        window.location.href = '/';
    }, []);

    const value = useMemo<AppData>(
        () => ({
            me,
            dataReady,
            mode,
            setMode,
            discovery,
            setDiscovery,
            filters,
            toggleTag,
            resetFilters,
            album,
            loading,
            error,
            history,
            saved,
            roll,
            showAlbum,
            toggleSave,
            removeSaved,
            logout,
            lock,
        }),
        [
            me,
            dataReady,
            mode,
            setMode,
            discovery,
            setDiscovery,
            filters,
            toggleTag,
            resetFilters,
            album,
            loading,
            error,
            history,
            saved,
            roll,
            showAlbum,
            toggleSave,
            removeSaved,
            logout,
            lock,
        ],
    );

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppData(): AppData {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
    return ctx;
}
