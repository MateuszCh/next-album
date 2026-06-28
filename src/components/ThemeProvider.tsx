'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContext {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const Ctx = createContext<ThemeContext | null>(null);

export function ThemeProvider({
    children,
    initialTheme,
}: {
    children: React.ReactNode;
    initialTheme: Theme;
}) {
    // Seed from the cookie the server already read, so SSR and the first client
    // render show the saved theme with no flash.
    const [theme, setThemeState] = useState<Theme>(initialTheme);

    const setTheme = useCallback((next: Theme) => {
        setThemeState(next);
        // Cookie so the server can render the right theme on the next request.
        document.cookie = `theme=${next}; path=/; max-age=31536000; samesite=lax`;
        document.documentElement.dataset.theme = next;
    }, []);

    // One-time migration for users whose preference is still only in localStorage
    // (and brand-new visitors with no cookie): adopt it and persist the cookie.
    useEffect(() => {
        if (document.cookie.split('; ').some((c) => c.startsWith('theme='))) return;
        const stored = window.localStorage.getItem('theme');
        const resolved: Theme = stored === 'light' || stored === 'dark' ? stored : initialTheme;
        if (resolved !== initialTheme) setTheme(resolved);
        else document.cookie = `theme=${resolved}; path=/; max-age=31536000; samesite=lax`;
    }, [initialTheme, setTheme]);

    const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeContext {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
}
