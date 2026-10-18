'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppData } from '@/components/AppDataProvider';
import { useI18n } from '@/components/LanguageProvider';
import { useTheme } from '@/components/ThemeProvider';
import { ClockIcon, DiscIcon, StarIcon, UserIcon } from '@/components/Icons';
import { countLabel } from '@/lib/i18n';

type Counted = 'history' | 'saved';

// The current tab's icon gets a heavier stroke (the star fills). `counted` tabs
// show how many albums they hold.
const ITEMS: {
    href: string;
    label: string;
    icon: (current: boolean) => React.ReactNode;
    counted?: Counted;
}[] = [
    { href: '/', label: 'nav.pick', icon: (c) => <DiscIcon strokeWidth={c ? 2 : 1.8} /> },
    {
        href: '/history',
        label: 'nav.history',
        icon: (c) => <ClockIcon strokeWidth={c ? 2 : 1.8} />,
        counted: 'history',
    },
    {
        href: '/saved',
        label: 'nav.saved',
        icon: (c) => <StarIcon size={22} strokeWidth={1.8} filled={c} />,
        counted: 'saved',
    },
    { href: '/account', label: 'nav.account', icon: (c) => <UserIcon strokeWidth={c ? 2 : 1.8} /> },
];

/**
 * The sticky four-tab menu: a coral pill marks the current tab in Okładka, a
 * lit key in Tuner. Historia and Ulubione carry their album count: a badge on
 * the icon in Okładka (hidden at zero), an LCD window on the key in Tuner
 * (a dimmed 00 at zero).
 */
export function BottomNav() {
    const { t, lang } = useI18n();
    const { skin } = useTheme();
    const { dataReady, history, saved } = useAppData();
    const pathname = usePathname();
    const tuner = skin === 'tuner';
    const counts: Record<Counted, number> = { history: history.length, saved: saved.length };

    return (
        <nav
            className={`sk-nav ${tuner ? 'sk-nav--key' : 'sk-nav--pill'}`}
            aria-label={t('nav.aria')}
        >
            {ITEMS.map(({ href, label, icon, counted }) => {
                const current = pathname === href;
                // No count until the data has loaded, so a 0 never flashes first.
                const count = counted && dataReady ? counts[counted] : null;
                const shown = count !== null && (tuner || count > 0);
                const badge = shown && (
                    <span
                        className={`sk-nav__count${count === 0 ? ' sk-nav__count--empty' : ''}`}
                        aria-hidden
                    >
                        {tuner ? String(count).padStart(2, '0') : count}
                    </span>
                );
                return (
                    <Link
                        key={href}
                        href={href}
                        aria-current={current ? 'page' : undefined}
                        aria-label={
                            count !== null
                                ? `${t(label)}, ${countLabel(t, lang, 'count.albums', count)}`
                                : undefined
                        }
                    >
                        <span className="sk-nav__icon">
                            {icon(current)}
                            {!tuner && badge}
                        </span>
                        <span className="sk-nav__label">{t(label)}</span>
                        {tuner && badge}
                    </Link>
                );
            })}
        </nav>
    );
}
