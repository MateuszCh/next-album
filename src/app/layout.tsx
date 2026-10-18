import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, DM_Sans, Instrument_Sans, Martian_Mono } from 'next/font/google';
import { cookies } from 'next/headers';
import './globals.css';
import { LanguageProvider } from '@/components/LanguageProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import type { Lang } from '@/lib/i18n';
import { MODE_COOKIE, SKIN_COOKIE, SKIN_ICONS, parseMode, parseSkin, themeFor } from '@/lib/skin';

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

const fontVariables = [bricolage, dmSans, martianMono, instrumentSans]
    .map((f) => f.variable)
    .join(' ');

// The favicon and the Apple touch icon follow the saved skin, so the server HTML
// already links the right ones (iOS keeps the touch icon it reads when a home
// screen shortcut is added). Declaring `icons` replaces Next's file-based icons.
export async function generateMetadata(): Promise<Metadata> {
    const skin = parseSkin((await cookies()).get(SKIN_COOKIE)?.value);
    const icons = SKIN_ICONS[skin];
    return {
        title: 'Next Album',
        description: 'A random album to listen to, picked based on your Last.fm profile.',
        icons: {
            icon: [{ url: icons.icon, type: 'image/svg+xml' }],
            apple: [{ url: icons.apple, sizes: '180x180', type: 'image/png' }],
        },
    };
}

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
