'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
    useState,
} from 'react';
import {
    MODE_COOKIE,
    SKIN_COOKIE,
    SKIN_ICONS,
    parseMode,
    themeFor,
    type Mode,
    type Skin,
    type ThemeId,
} from '@/lib/skin';

interface ThemeContext {
    skin: Skin;
    /** The stored dark/light preference (kept while Tuner overrides it). */
    mode: Mode;
    /** What `data-theme` on <html> is set to. */
    theme: ThemeId;
    setSkin: (skin: Skin) => void;
    setMode: (mode: Mode) => void;
}

const Ctx = createContext<ThemeContext | null>(null);

function writeCookie(name: string, value: string) {
    document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
}

// The server HTML links the saved skin's favicon and Apple touch icon
// (`layout.tsx`); a live switch repoints them until the next request does.
function applyIcons(skin: Skin) {
    const icons = SKIN_ICONS[skin];
    document
        .querySelectorAll<HTMLLinkElement>('link[rel~="icon"], link[rel="apple-touch-icon"]')
        .forEach((link) => {
            const href = link.rel === 'apple-touch-icon' ? icons.apple : icons.icon;
            if (link.getAttribute('href') !== href) link.setAttribute('href', href);
        });
}

export function ThemeProvider({
    children,
    initialSkin,
    initialMode,
}: {
    children: React.ReactNode;
    initialSkin: Skin;
    initialMode: Mode;
}) {
    // Seed from the cookies the server already read, so SSR and the first client
    // render show the saved skin with no flash.
    const [skin, setSkinState] = useState<Skin>(initialSkin);
    const [mode, setModeState] = useState<Mode>(initialMode);
    const theme = themeFor(skin, mode);

    // Applied before paint, so the components switching variant and the tokens
    // switching theme land in the same frame.
    useLayoutEffect(() => {
        document.documentElement.dataset.theme = theme;
    }, [theme]);

    useLayoutEffect(() => {
        applyIcons(skin);
    }, [skin]);

    const setSkin = useCallback((next: Skin) => {
        setSkinState(next);
        // Cookie so the server can render the right skin on the next request.
        writeCookie(SKIN_COOKIE, next);
    }, []);

    const setMode = useCallback((next: Mode) => {
        setModeState(next);
        writeCookie(MODE_COOKIE, next);
    }, []);

    // One-time migration for users whose mode is still only in localStorage
    // (and brand-new visitors with no cookie): adopt it and persist the cookie.
    useEffect(() => {
        if (document.cookie.split('; ').some((c) => c.startsWith(`${MODE_COOKIE}=`))) return;
        const resolved = parseMode(window.localStorage.getItem('theme')) ?? initialMode;
        if (resolved !== initialMode) setMode(resolved);
        else writeCookie(MODE_COOKIE, resolved);
    }, [initialMode, setMode]);

    const value = useMemo(
        () => ({ skin, mode, theme, setSkin, setMode }),
        [skin, mode, theme, setSkin, setMode],
    );

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeContext {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
}
