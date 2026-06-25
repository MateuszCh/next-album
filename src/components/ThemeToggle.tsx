'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const SunIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="2" />
        <path
            d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
        />
    </svg>
);

const MoonIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden xmlns="http://www.w3.org/2000/svg">
        <path
            d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
        />
    </svg>
);

export function ThemeToggle() {
    // Start as null so SSR and first client render match the inline-script-set
    // attribute; we read the real value once mounted.
    const [theme, setTheme] = useState<Theme | null>(null);

    useEffect(() => {
        const current = (document.documentElement.dataset.theme as Theme) ?? 'dark';
        setTheme(current);
    }, []);

    const toggle = () => {
        const next: Theme = theme === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = next;
        window.localStorage.setItem('theme', next);
        setTheme(next);
    };

    return (
        <button
            type="button"
            className="btn-icon"
            onClick={toggle}
            aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
            title={theme === 'light' ? 'Dark theme' : 'Light theme'}
        >
            {theme === 'light' ? <SunIcon /> : <MoonIcon />}
        </button>
    );
}
