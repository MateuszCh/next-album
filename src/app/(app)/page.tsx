'use client';

import { useRef } from 'react';
import { AlbumCard, AlbumEmpty } from '@/components/AlbumCard';
import { APP_MODES, useAppData } from '@/components/AppDataProvider';
import { Credits } from '@/components/Credits';
import { ListenLinks } from '@/components/ListenLinks';
import { LoginButton } from '@/components/LoginButton';
import { Logo } from '@/components/Logo';
import { ModeSlider } from '@/components/ModeSlider';
import { NextButton } from '@/components/NextButton';
import { SearchFilters } from '@/components/SearchFilters';
import { Segmented } from '@/components/Segmented';
import { useI18n } from '@/components/LanguageProvider';
import { useTheme } from '@/components/ThemeProvider';
import { errorMessage } from '@/lib/i18n';
import { albumKey, isSaved } from '@/lib/history';

/** Losuj: the picked album, the Next button and the pick settings / search filters. */
export default function PickPage() {
    const { t } = useI18n();
    const { skin } = useTheme();
    const {
        me,
        mode,
        setMode,
        discovery,
        setDiscovery,
        album,
        loading,
        error,
        saved,
        roll,
        toggleSave,
    } = useAppData();
    const settingsRef = useRef<HTMLElement>(null);
    const tuner = skin === 'tuner';

    const header = (
        <header className="pick-head">
            <Logo />
            {me && (
                <Segmented
                    kind="tabs"
                    compact
                    label={t('mode.aria')}
                    options={APP_MODES.map((m) => ({
                        value: m,
                        label: t(m === 'lastfm' ? 'mode.lastfm' : 'mode.searchShort'),
                    }))}
                    value={mode}
                    onChange={setMode}
                    disabled={loading}
                />
            )}
        </header>
    );

    if (me === null) {
        return (
            <div className="pick">
                {header}
                <p className="screen-empty">{t('loading')}</p>
            </div>
        );
    }

    const errorBox = error && <div className="error pick-error">{errorMessage(t, error)}</div>;

    // The Last.fm mode needs Last.fm: logged out it shows the login, and an email
    // account without Last.fm gets the same slot to connect it.
    if (mode === 'lastfm' && !me.lastfmUsername) {
        return (
            <div className="pick">
                {header}
                <AlbumEmpty
                    appMode={mode}
                    title={t(me.loggedIn ? 'link.title' : 'loggedOut.title')}
                    text={t(me.loggedIn ? 'link.subtitle' : 'loggedOut.subtitle')}
                />
                <div className="pick-cta">
                    <LoginButton link={me.loggedIn} />
                </div>
                {errorBox}
                <Credits className="pick-credits" />
            </div>
        );
    }

    const displayName = me.lastfmUsername ?? me.email ?? '';
    const hint = t(mode === 'lastfm' ? 'hint.default' : 'hint.search');
    const settingsLabel = t(mode === 'lastfm' ? 'draw.settings' : 'draw.filters');

    const display = album ? (
        <AlbumCard key={albumKey(album)} album={album} appMode={mode} />
    ) : (
        <AlbumEmpty
            appMode={mode}
            title={
                mode === 'lastfm'
                    ? t('loggedIn.title', { username: displayName })
                    : t('search.title')
            }
            text={t(mode === 'lastfm' ? 'loggedIn.subtitle' : 'search.subtitle')}
            hint={hint}
        />
    );

    const controls =
        mode === 'lastfm' ? (
            <ModeSlider value={discovery} onChange={setDiscovery} disabled={loading} />
        ) : (
            <SearchFilters disabled={loading} />
        );

    const scrollToSettings = () => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        settingsRef.current?.scrollIntoView({
            behavior: reduce ? 'auto' : 'smooth',
            block: 'start',
        });
    };

    return (
        <div className="pick">
            {header}
            {display}
            <NextButton
                onNext={roll}
                loading={loading}
                caption={album ? undefined : hint}
                save={
                    album
                        ? { saved: isSaved(saved, album), onToggle: () => toggleSave(album) }
                        : undefined
                }
                settings={{ label: settingsLabel, onClick: scrollToSettings }}
            />
            {errorBox}
            {album && (
                <ListenLinks
                    album={album}
                    saved={isSaved(saved, album)}
                    onToggleSave={() => toggleSave(album)}
                />
            )}
            <section
                ref={settingsRef}
                className={tuner ? (mode === 'lastfm' ? 'tun-panel' : 'tun-filters') : 'sheet'}
                aria-label={settingsLabel}
            >
                {!tuner && <h2 className="sheet__title">{settingsLabel}</h2>}
                {controls}
                {!tuner && <Credits />}
            </section>
            {tuner && <Credits className="pick-credits" />}
        </div>
    );
}
