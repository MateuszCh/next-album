'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { detectLang, translate, type Lang, type TFn, type TranslateParams } from '@/lib/i18n';

interface I18nContext {
    lang: Lang;
    setLang: (lang: Lang) => void;
    t: TFn;
}

const Ctx = createContext<I18nContext | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    // Start with a deterministic value so SSR and first client render match;
    // resolve the real preference (localStorage → browser) once mounted.
    const [lang, setLangState] = useState<Lang>('en');

    useEffect(() => {
        const stored = window.localStorage.getItem('lang');
        const initial: Lang = stored === 'pl' || stored === 'en' ? stored : detectLang();
        setLangState(initial);
        document.documentElement.lang = initial;
    }, []);

    const setLang = useCallback((next: Lang) => {
        setLangState(next);
        window.localStorage.setItem('lang', next);
        document.documentElement.lang = next;
    }, []);

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
