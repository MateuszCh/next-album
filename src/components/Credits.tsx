'use client';

import { useI18n } from '@/components/LanguageProvider';

/** Data credits (Last.fm, Discogs) — on the Losuj screen and in Konto → Ustawienia. */
export function Credits({ className = '' }: { className?: string }) {
    const { t } = useI18n();
    return (
        <footer className={`credits ${className}`}>
            <a href="https://www.last.fm/" target="_blank" rel="noreferrer">
                {t('footer.poweredBy')}
            </a>
            <a href="https://www.discogs.com/" target="_blank" rel="noreferrer">
                {t('footer.discogs')}
            </a>
        </footer>
    );
}
