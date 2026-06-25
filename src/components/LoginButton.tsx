'use client';

import { useI18n } from '@/components/LanguageProvider';

export function LoginButton() {
    const { t } = useI18n();
    return (
        <a className="btn btn-primary btn-big" href="/api/auth/login">
            {t('login')}
        </a>
    );
}
