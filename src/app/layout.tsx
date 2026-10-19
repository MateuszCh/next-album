import type { Metadata, Viewport } from 'next';
import {
    Archivo,
    Bricolage_Grotesque,
    DM_Sans,
    Fraunces,
    Instrument_Sans,
    Kalam,
    Manrope,
    Martian_Mono,
    Nunito_Sans,
    Unbounded,
} from 'next/font/google';
import localFont from 'next/font/local';
import { cookies } from 'next/headers';
import './globals.css';
// The other skins: tokens and the styles that differ from the shared ones.
import './skins/kaseta.css';
import './skins/rave.css';
import './skins/ambient.css';
import './skins/guma.css';
import { LanguageProvider } from '@/components/LanguageProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import type { Lang } from '@/lib/i18n';
import { MODE_COOKIE, SKIN_COOKIE, parseMode, parseSkin, themeFor } from '@/lib/skin';

// Okładka skin: a tight, heavy grotesk for titles + a friendly sans for reading.
const bricolage = Bricolage_Grotesque({
    subsets: ['latin', 'latin-ext'],
    variable: '--font-okladka-display',
    display: 'swap',
});

const dmSans = DM_Sans({
    subsets: ['latin', 'latin-ext'],
    variable: '--font-okladka-sans',
    display: 'swap',
});

// Tuner skin: a mono for every label and readout (the width axis gives the
// condensed `font-stretch: 85%` titles) + a plain sans for notes. Not preloaded:
// Okładka is the default skin, and a font is only fetched once the page uses it.
const martianMono = Martian_Mono({
    subsets: ['latin', 'latin-ext'],
    axes: ['wdth'],
    variable: '--font-tuner-mono',
    display: 'swap',
    preload: false,
});

const instrumentSans = Instrument_Sans({
    subsets: ['latin', 'latin-ext'],
    variable: '--font-tuner-sans',
    display: 'swap',
    preload: false,
});

// Kaseta: a condensed grotesk (the width axis gives the 70–80% labels) + a
// marker for album titles. Rave: a wide display face + a plain sans. Ambient: a
// soft serif (with italics) + a rounded sans. Guma: one rounded face. None is
// preloaded; a font is only fetched once its skin is on screen.
const archivo = Archivo({
    subsets: ['latin', 'latin-ext'],
    axes: ['wdth'],
    variable: '--font-kaseta',
    display: 'swap',
    preload: false,
});

// Kalam, not Permanent Marker: Permanent Marker lacks ą ć ę ł ń ś ź ż.
const kalam = Kalam({
    subsets: ['latin', 'latin-ext'],
    weight: '700',
    variable: '--font-kaseta-marker',
    display: 'swap',
    preload: false,
});

const unbounded = Unbounded({
    subsets: ['latin', 'latin-ext'],
    variable: '--font-rave-display',
    display: 'swap',
    preload: false,
});

const manrope = Manrope({
    subsets: ['latin', 'latin-ext'],
    variable: '--font-rave-sans',
    display: 'swap',
    preload: false,
});

const fraunces = Fraunces({
    subsets: ['latin', 'latin-ext'],
    style: ['normal', 'italic'],
    variable: '--font-ambient-serif',
    display: 'swap',
    preload: false,
});

const nunitoSans = Nunito_Sans({
    subsets: ['latin', 'latin-ext'],
    variable: '--font-ambient-sans',
    display: 'swap',
    preload: false,
});

// Nunito, not Fredoka: Google's Fredoka lacks ą ć ę ń ś ź ż. Nunito is lighter
// at the same weight, so each CSS weight maps to a Nunito instance 200 heavier
// (static latin + latin-ext cuts in ./skins/fonts), matching Fredoka's heft.
const gumaFont = localFont({
    src: [
        { path: './skins/fonts/nunito-500.woff2', weight: '400' },
        { path: './skins/fonts/nunito-700.woff2', weight: '500' },
        { path: './skins/fonts/nunito-800.woff2', weight: '600' },
        { path: './skins/fonts/nunito-900.woff2', weight: '700' },
        { path: './skins/fonts/nunito-900.woff2', weight: '800' },
    ],
    variable: '--font-guma',
    display: 'swap',
    preload: false,
});

const fontVariables = [
    bricolage,
    dmSans,
    martianMono,
    instrumentSans,
    archivo,
    kalam,
    unbounded,
    manrope,
    fraunces,
    nunitoSans,
    gumaFont,
]
    .map((f) => f.variable)
    .join(' ');

// One set of icons for every skin, Next's file-based ones beside this layout:
// `favicon.ico`, `icon.svg` and `apple-icon.tsx`.
export const metadata: Metadata = {
    title: 'Next Album',
    description: 'A random album to listen to, picked based on your Last.fm profile.',
};

export const viewport: Viewport = {
    // Lets the fixed bottom nav sit above the iOS home indicator (safe-area insets).
    viewportFit: 'cover',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    const jar = await cookies();
    const storedLang = jar.get('lang')?.value;
    const initialLang: Lang = storedLang === 'pl' || storedLang === 'en' ? storedLang : 'en';
    const initialSkin = parseSkin(jar.get(SKIN_COOKIE)?.value);
    const initialMode = parseMode(jar.get(MODE_COOKIE)?.value) ?? 'dark';

    return (
        <html
            lang={initialLang}
            data-theme={themeFor(initialSkin, initialMode)}
            className={fontVariables}
            suppressHydrationWarning
        >
            <body suppressHydrationWarning>
                <ThemeProvider initialSkin={initialSkin} initialMode={initialMode}>
                    <LanguageProvider initialLang={initialLang}>{children}</LanguageProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
