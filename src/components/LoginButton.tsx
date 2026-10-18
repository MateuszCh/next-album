'use client';

import { useI18n } from '@/components/LanguageProvider';

/** Last.fm login. With `link`, connects Last.fm to the logged-in email account instead. */
export function LoginButton({ link = false }: { link?: boolean }) {
    const { t } = useI18n();
    return (
        <a
            className="sk-btn sk-btn--primary"
            href={link ? '/api/auth/login?link=1' : '/api/auth/login'}
        >
            {t(link ? 'link.button' : 'login')}
        </a>
    );
}
