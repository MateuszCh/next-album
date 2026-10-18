'use client';

import { useId, useState } from 'react';
import { useAppData, type Me } from '@/components/AppDataProvider';
import { Credits } from '@/components/Credits';
import { EmailLoginForm } from '@/components/EmailLoginForm';
import { LogoutIcon } from '@/components/Icons';
import { LoginButton } from '@/components/LoginButton';
import { Segmented } from '@/components/Segmented';
import { StylePicker } from '@/components/StylePicker';
import { useI18n } from '@/components/LanguageProvider';
import { useTheme } from '@/components/ThemeProvider';
import type { Lang } from '@/lib/i18n';
import { SKIN_MODES, modeFor, type Mode } from '@/lib/skin';

type Tab = 'account' | 'settings';

// The sub-tab last chosen, kept in this module's memory: it survives leaving
// Konto for another tab (the page unmounts) and resets on a reload. Only
// written from the click handler, so the server render always starts at
// 'account' and hydration matches.
let rememberedTab: Tab = 'account';

const LANG_ORDER: Lang[] = ['pl', 'en'];

/**
 * Konto: Profil | Ustawienia when logged in, Zaloguj się | Ustawienia for
 * guests. Ustawienia (style, theme, language) works without an account.
 */
export default function AccountPage() {
    const { t } = useI18n();
    const { me } = useAppData();
    const [tab, setTabState] = useState<Tab>(() => rememberedTab);
    const setTab = (next: Tab) => {
        rememberedTab = next;
        setTabState(next);
    };
    const loggedIn = me.loggedIn;

    return (
        <div className="screen">
            <header className="screen-head">
                <h1 className="screen-title">{t('nav.account')}</h1>
            </header>

            <div className="screen-stack">
                <Segmented
                    kind="tabs"
                    label={t('account.tab.aria')}
                    options={[
                        {
                            value: 'account',
                            label: t(loggedIn ? 'account.tab.profile' : 'account.tab.login'),
                        },
                        { value: 'settings', label: t('account.tab.settings') },
                    ]}
                    value={tab}
                    onChange={setTab}
                    panelIdPrefix="account"
                />
                <div
                    role="tabpanel"
                    id={`account-${tab}`}
                    aria-labelledby={`account-tab-${tab}`}
                    className="screen-stack"
                >
                    {tab === 'settings' ? (
                        <Settings loggedIn={loggedIn} />
                    ) : loggedIn ? (
                        <Profile me={me} />
                    ) : (
                        <GuestLogin gateEnabled={me.gateEnabled ?? false} />
                    )}
                </div>
            </div>
        </div>
    );
}

function LockButton() {
    const { t } = useI18n();
    const { lock } = useAppData();
    return (
        <button type="button" className="sk-btn sk-btn--quiet" onClick={lock}>
            {t('account.lock')}
        </button>
    );
}

function Profile({ me }: { me: Me }) {
    const { t } = useI18n();
    const { logout } = useAppData();
    const name = me.lastfmUsername ?? me.email ?? '';
    const hasLastfm = Boolean(me.lastfmUsername);

    return (
        <>
            <section className="profile">
                <span className="profile__avatar" aria-hidden>
                    {me.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={me.imageUrl} alt="" />
                    ) : (
                        name.charAt(0).toUpperCase()
                    )}
                </span>
                <span className="profile__text">
                    <span className="profile__name">{name}</span>
                    <span className="profile__via">
                        {t(me.email ? 'account.viaEmail' : 'account.viaLastfm')}
                    </span>
                </span>
            </section>

            <section className="group">
                <h2 className="section-label">{t('account.connections')}</h2>
                <div className="panel">
                    <div className="set-row">
                        <span className="set-row__text">
                            <span className="set-row__title">Last.fm</span>
                            <span className="set-row__note">
                                {t(hasLastfm ? 'account.lastfmActive' : 'account.lastfmInactive')}
                            </span>
                        </span>
                        {hasLastfm ? (
                            <span className="status-pill">
                                <span className="led led--on" aria-hidden />
                                {t('account.connected')}
                            </span>
                        ) : (
                            <a className="sk-btn sk-btn--small" href="/api/auth/login?link=1">
                                {t('account.connect')}
                            </a>
                        )}
                    </div>
                </div>
            </section>

            <p className="screen-note">{t('account.syncNote')}</p>

            <div className="screen-actions">
                <button type="button" className="sk-btn sk-btn--outline" onClick={logout}>
                    <LogoutIcon />
                    {t('btn.logout')}
                </button>
                {me.gateEnabled && <LockButton />}
            </div>
        </>
    );
}

function GuestLogin({ gateEnabled }: { gateEnabled: boolean }) {
    const { t } = useI18n();
    const { skin } = useTheme();

    return (
        <>
            {skin === 'tuner' ? (
                <section className="lcd-note">
                    <span className="lcd-note__status">○ {t('account.notLoggedIn')}</span>
                    <p>{t('loginPage.subtitle')}</p>
                </section>
            ) : (
                <p className="screen-note">{t('loginPage.subtitle')}</p>
            )}

            <section className="panel panel--feature login-card">
                <h2 className="login-card__title">{t('loginPage.lastfm')}</h2>
                <p className="login-card__text">{t('loginPage.lastfmNote')}</p>
                <LoginButton />
            </section>

            <div className="divider">{t('loginPage.or')}</div>

            <section className="panel login-card">
                <h2 className="login-card__title">{t('loginPage.email')}</h2>
                <EmailLoginForm />
            </section>

            <p className="screen-note screen-note--small">{t('account.guestNote')}</p>
            {gateEnabled && (
                <div className="screen-actions">
                    <LockButton />
                </div>
            )}
        </>
    );
}

function Settings({ loggedIn }: { loggedIn: boolean }) {
    const { t, lang, setLang } = useI18n();
    const { skin, mode, setMode } = useTheme();
    const noteId = useId();
    const modes = SKIN_MODES[skin];
    const tuner = skin === 'tuner';

    return (
        <>
            <section className="group">
                <h2 className="section-label">{t('settings.style')}</h2>
                <StylePicker />
            </section>

            <section className="group">
                <h2 className="section-label">{t('settings.looks')}</h2>
                <div className="panel panel--rows">
                    <div className="set-row">
                        <span className="set-row__title">{t('settings.theme')}</span>
                        <Segmented<Mode>
                            kind="radio"
                            compact
                            label={t('settings.theme')}
                            options={(['dark', 'light'] as Mode[]).map((m) => ({
                                value: m,
                                label: t(`settings.${m}`),
                                disabled: !modes.includes(m),
                            }))}
                            // A one-mode skin shows its mode; the stored one comes back
                            // with Okładka.
                            value={modeFor(skin, mode)}
                            onChange={setMode}
                            describedBy={noteId}
                        />
                    </div>
                    <p className="set-row__note set-row__note--block" id={noteId}>
                        {t('settings.modesNote')}
                    </p>
                    <div className="set-row">
                        <span className="set-row__title">{t('settings.language')}</span>
                        <Segmented<Lang>
                            kind="radio"
                            compact
                            label={t('settings.language')}
                            options={LANG_ORDER.map((l) => ({
                                value: l,
                                label: tuner ? t(`lang.name.${l}`) : l.toUpperCase(),
                            }))}
                            value={lang}
                            onChange={setLang}
                        />
                    </div>
                </div>
                {!loggedIn && <p className="screen-note">{t('settings.guestNote')}</p>}
            </section>

            <section className="group">
                <h2 className="section-label">{t('settings.about')}</h2>
                <Credits className="panel panel--about" />
            </section>
        </>
    );
}
