'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/components/LanguageProvider';
import { useTheme } from '@/components/ThemeProvider';
import { ClockIcon, DiscIcon, StarIcon, UserIcon } from '@/components/Icons';

// The current tab's icon gets a heavier stroke (the star fills).
const ITEMS: { href: string; label: string; icon: (current: boolean) => React.ReactNode }[] = [
    { href: '/', label: 'nav.pick', icon: (c) => <DiscIcon strokeWidth={c ? 2 : 1.8} /> },
    {
        href: '/history',
        label: 'nav.history',
        icon: (c) => <ClockIcon strokeWidth={c ? 2 : 1.8} />,
    },
    {
        href: '/saved',
        label: 'nav.saved',
        icon: (c) => <StarIcon size={22} strokeWidth={1.8} filled={c} />,
    },
    { href: '/account', label: 'nav.account', icon: (c) => <UserIcon strokeWidth={c ? 2 : 1.8} /> },
];

/**
 * The sticky four-tab menu: a coral pill marks the current tab in Okładka, a
 * lit key in Tuner.
 */
export function BottomNav() {
    const { t } = useI18n();
    const { skin } = useTheme();
    const pathname = usePathname();

    return (
        <nav
            className={`sk-nav ${skin === 'tuner' ? 'sk-nav--key' : 'sk-nav--pill'}`}
            aria-label={t('nav.aria')}
        >
            {ITEMS.map(({ href, label, icon }) => {
                const current = pathname === href;
                return (
                    <Link key={href} href={href} aria-current={current ? 'page' : undefined}>
                        <span className="sk-nav__icon">{icon(current)}</span>
                        <span className="sk-nav__label">{t(label)}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
