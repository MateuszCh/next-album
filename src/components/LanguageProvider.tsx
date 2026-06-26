'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { detectLang, translate, type Lang, type TFn, type TranslateParams } from '@/lib/i18n';

interface I18nContext {
    lang: Lang;
    setLang: (lang: Lang) => void;
    t: TFn;
}

const Ctx = createContext<I18nContext | null>(null);

export function LanguageProvider({
    children,
    initialLang,
}: {
    children: React.ReactNode;
    initialLang: Lang;
}) {
    // Seed from the cookie the server already read, so SSR and the first client
    // render show the saved language with no flash.
    const [lang, setLangState] = useState<Lang>(initialLang);

    const setLang = useCallback((next: Lang) => {
        setLangState(next);
        // Cookie so the server can render the right language on the next request.
        document.cookie = `lang=${next}; path=/; max-age=31536000; samesite=lax`;
        document.documentElement.lang = next;
    }, []);

    // One-time migration for users whose preference is still only in localStorage
    // (and brand-new visitors with no cookie): adopt it and persist the cookie.
    useEffect(() => {
        if (document.cookie.split('; ').some((c) => c.startsWith('lang='))) return;
        const stored = window.localStorage.getItem('lang');
        const resolved: Lang = stored === 'pl' || stored === 'en' ? stored : detectLang();
        if (resolved !== initialLang) setLang(resolved);
        else document.cookie = `lang=${resolved}; path=/; max-age=31536000; samesite=lax`;
    }, [initialLang, setLang]);

    const t = useCallback<TFn>((key, params?: TranslateParams) => translate(lang, key, params), [
        lang,
    ]);

    const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nContext {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error('useI18n must be used within LanguageProvider');
    return ctx;
}
