// App skins: a skin is a theme plus a choice of rendering for the signature
// components (album display, next button, balance control, bottom nav).
// Two preferences are stored as cookies and the `data-theme` on <html> is
// derived from them:
// - `skin` — `okladka` (cover-first, dark or light) or `tuner` (hi-fi, dark only);
// - `theme` — the mode, `dark` or `light` (the pre-skin theme cookie). Tuner
//   ignores it, so switching back to Okładka restores the last mode.
// Shared by the server layout (reads the cookies) and the client ThemeProvider.

export type Skin = 'okladka' | 'tuner';

export type Mode = 'dark' | 'light';

export type ThemeId = 'okladka-dark' | 'okladka-light' | 'tuner';

export const SKINS: Skin[] = ['okladka', 'tuner'];

export const SKIN_COOKIE = 'skin';

export const MODE_COOKIE = 'theme';

export function parseSkin(value: string | null | undefined): Skin {
    return value === 'tuner' ? 'tuner' : 'okladka';
}

export function parseMode(value: string | null | undefined): Mode | null {
    return value === 'light' || value === 'dark' ? value : null;
}

/** Whether the skin offers a light version (Tuner is dark only). */
export function skinHasLight(skin: Skin): boolean {
    return skin === 'okladka';
}

export function themeFor(skin: Skin, mode: Mode): ThemeId {
    return skin === 'tuner' ? 'tuner' : mode === 'light' ? 'okladka-light' : 'okladka-dark';
}

/**
 * Favicon and Apple touch icon per skin. `layout.tsx` links the saved skin's in
 * the server HTML (from the cookie); `ThemeProvider` repoints them on a live
 * switch. `/favicon.ico` (Okładka) stays an unlinked fallback.
 */
export const SKIN_ICONS: Record<Skin, { icon: string; apple: string }> = {
    okladka: { icon: '/favicon-okladka.svg', apple: '/apple-touch-icon/okladka' },
    tuner: { icon: '/favicon-tuner.svg', apple: '/apple-touch-icon/tuner' },
};
