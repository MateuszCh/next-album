import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import { cookies } from 'next/headers';
import './globals.css';
import { LanguageProvider } from '@/components/LanguageProvider';
import { ThemeProvider, type Theme } from '@/components/ThemeProvider';
import type { Lang } from '@/lib/i18n';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-sans',
    display: 'swap',
});

// Distinctive geometric grotesk used for headings, logo and prominent labels —
// gives a clearly visible identity next to the neutral body font.
const spaceGrotesk = Space_Grotesk({
    subsets: ['latin'],
    variable: '--font-display',
    display: 'swap',
});

export const metadata: Metadata = {
    title: 'Next Album',
    description: 'A random album to listen to, picked based on your Last.fm profile.',
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    const jar = await cookies();
    const storedLang = jar.get('lang')?.value;
    const initialLang: Lang = storedLang === 'pl' || storedLang === 'en' ? storedLang : 'en';
    const storedTheme = jar.get('theme')?.value;
    const initialTheme: Theme = storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'dark';

    return (
        <html
            lang={initialLang}
            data-theme={initialTheme}
            className={`${inter.variable} ${spaceGrotesk.variable}`}
            suppressHydrationWarning
        >
            <body suppressHydrationWarning>
                <ThemeProvider initialTheme={initialTheme}>
                    <LanguageProvider initialLang={initialLang}>{children}</LanguageProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
