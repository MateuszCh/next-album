// App skins: a skin is a theme plus a choice of rendering for the signature
// components (album display, next button, balance control, bottom nav).
// Two preferences are stored as cookies and the `data-theme` on <html> is
// derived from them:
// - `skin` — one of `SKINS` (default `okladka`);
// - `theme` — the mode, `dark` or `light` (the pre-skin theme cookie). Only
//   Okładka comes in both; every other skin has one fixed mode (`SKIN_MODES`)
//   and ignores the cookie, so switching back to Okładka restores the last mode.
// Shared by the server layout (reads the cookies) and the client ThemeProvider.

export type Skin = 'okladka' | 'tuner' | 'kaseta' | 'rave' | 'ambient' | 'guma';

export type Mode = 'dark' | 'light';

export type ThemeId = 'okladka-dark' | 'okladka-light' | Exclude<Skin, 'okladka'>;

/** All skins, in the order the style picker shows them. */
export const SKINS: Skin[] = ['okladka', 'tuner', 'kaseta', 'rave', 'guma', 'ambient'];

/** The modes each skin comes in: Okładka both, every other skin one fixed mode. */
export const SKIN_MODES: Record<Skin, Mode[]> = {
    okladka: ['dark', 'light'],
    tuner: ['dark'],
    kaseta: ['dark'],
    rave: ['dark'],
    ambient: ['light'],
    guma: ['light'],
};

export const SKIN_COOKIE = 'skin';

export const MODE_COOKIE = 'theme';

export function parseSkin(value: string | null | undefined): Skin {
    return SKINS.find((skin) => skin === value) ?? 'okladka';
}

export function parseMode(value: string | null | undefined): Mode | null {
    return value === 'light' || value === 'dark' ? value : null;
}

/** The mode a skin is shown in: the stored one if the skin has it, else its only mode. */
export function modeFor(skin: Skin, mode: Mode): Mode {
    const modes = SKIN_MODES[skin];
    return modes.includes(mode) ? mode : modes[0];
}

/**
 * Which album layout a skin uses: a full-width cover with the text under it, or
 * a panel with the cover beside the title (Tuner's LCD, Kaseta's cassette card).
 */
export function albumLayout(skin: Skin): 'cover' | 'display' {
    return skin === 'tuner' || skin === 'kaseta' ? 'display' : 'cover';
}

export function themeFor(skin: Skin, mode: Mode): ThemeId {
    return skin === 'okladka' ? `okladka-${modeFor(skin, mode)}` : skin;
}

/**
 * Favicon and Apple touch icon per skin. `layout.tsx` links the saved skin's in
 * the server HTML (from the cookie); `ThemeProvider` repoints them on a live
 * switch. `/favicon.ico` (Okładka) stays an unlinked fallback.
 */
const OKLADKA_ICONS = { icon: '/favicon-okladka.svg', apple: '/apple-touch-icon/okladka' };

export const SKIN_ICONS: Record<Skin, { icon: string; apple: string }> = {
    okladka: OKLADKA_ICONS,
    tuner: { icon: '/favicon-tuner.svg', apple: '/apple-touch-icon/tuner' },
    // No artwork of their own yet: the default skin's icons.
    kaseta: OKLADKA_ICONS,
    rave: OKLADKA_ICONS,
    ambient: OKLADKA_ICONS,
    guma: OKLADKA_ICONS,
};
