// Lightweight client-side i18n: a flat dictionary per language plus a tiny
// interpolating lookup. No dependency — mirrors the existing localStorage-driven
// preferences (theme, discovery, …).

import { getGenre } from '@/lib/recommend/genres';
import { getDecade } from '@/lib/recommend/decades';
import { getCountry } from '@/lib/recommend/countries';

export type Lang = 'pl' | 'en';

export const LANGS: Lang[] = ['en', 'pl'];

export type TranslateParams = Record<string, string | number>;

// Structured recommendation reason — translated on the client so switching the
// language re-renders the reason of an already-shown album.
export type AlbumReason =
    | { kind: 'rediscovery'; playcount: number }
    | { kind: 'discovery'; seedName: string }
    // Album search (Discogs): the drawn filter tags + how many Discogs users own it.
    | { kind: 'search'; filters: string[]; have: number }
    // Legacy kinds kept so albums saved in history before still render.
    | { kind: 'rediscovery_filtered'; filters: string[]; now: boolean; playcount: number }
    | { kind: 'discovery_filtered'; filters: string[]; now: boolean; seedName?: string }
    | { kind: 'rediscovery_genre'; genre: string; playcount: number }
    | { kind: 'discovery_genre'; genre: string }
    | { kind: 'current_favorite'; playcount: number }
    | { kind: 'current_discovery'; seedName: string };

type Dict = Record<string, string>;

const en: Dict = {
    loading: 'Loading…',

    'loggedOut.title': 'What should you listen to?',
    'loggedOut.subtitle':
        "Log in with your Last.fm account and we'll pick a specific album to play — sometimes a favorite classic, sometimes something new from an artist similar to yours.",
    login: 'Log in with Last.fm',

    'mode.aria': 'Mode',
    'mode.lastfm': 'For me',
    'mode.search': 'Find an album',

    'loggedIn.title': 'Hi, {username}',
    'loggedIn.subtitle':
        'Set the balance and get your next album. The more “discovery”, the more often we suggest something new beyond your history.',

    'search.title': 'Find an album',
    'search.subtitle':
        'Pick a genre, decade and country — we’ll draw a well-loved album from Discogs. No Last.fm account needed.',

    'filter.reset': 'Clear',
    'filter.genre': 'Genre',
    'filter.decade': 'Decade',
    'filter.country': 'Country',
    'genre.placeholder': 'Any genre',
    'decade.placeholder': 'Any decade',
    'country.placeholder': 'Any country',

    'country.british': 'United Kingdom',
    'country.american': 'United States',
    'country.polish': 'Poland',
    'country.german': 'Germany',
    'country.french': 'France',
    'country.japanese': 'Japan',
    'country.brazilian': 'Brazil',
    'country.italian': 'Italy',
    'country.spanish': 'Spain',

    'slider.favorites': 'Favorites',
    'slider.discovery': 'Discovery',
    'slider.aria': 'Balance between favorites and discovery',

    'btn.next': 'Next Album',
    'btn.rolling': 'Rolling…',
    'btn.lock': 'Lock',
    'btn.logout': 'Log out',

    'hint.default': 'Set the balance and click “Next Album”.',
    'hint.search': 'Set the filters (or leave them empty) and click “Next Album”.',

    'card.discovery': 'Discovery',
    'card.favorites': 'From favorites',
    'card.search': 'Search',
    'card.coverAlt': 'Cover: {name}',
    'card.save': 'Save album',
    'card.unsave': 'Remove from saved',

    'history.title': 'Recent',
    'history.saved': 'Saved',
    'history.remove': 'Remove',

    'reason.rediscovery': 'From your favorites — played {playcount}×.',
    'reason.discovery': 'Something new — similar to “{seed}”, who you listen to.',
    'reason.rediscovery_filtered': 'From your favorites ({scope}) — played {playcount}×.',
    'reason.discovery_filtered': 'Something new ({scope}) — similar to “{seed}”.',
    'reason.discovery_filtered_noseed': 'Something new ({scope}).',
    'reason.scope_now': 'this week',
    'reason.rediscovery_genre': 'From your favorites in {genre} — played {playcount}×.',
    'reason.discovery_genre': 'Something new in {genre}.',
    'reason.current_favorite': 'From what you’re into this week — played {playcount}×.',
    'reason.current_discovery': 'Fresh pick from “{seed}”, who you’re spinning this week.',
    'reason.search': 'Matches {scope} — in {have} Discogs collections.',
    'reason.search_noscope': 'Popular on Discogs — in {have} collections.',

    'theme.toLight': 'Switch to light theme',
    'theme.toDark': 'Switch to dark theme',
    'lang.aria': 'Language',

    'footer.poweredBy': 'Powered by AudioScrobbler / Last.fm',
    'footer.discogs': 'Album search data provided by Discogs',

    'gate.title': 'Access restricted',
    'gate.subtitle':
        'This app is available only to invited people. Enter the access password to continue.',
    'gate.placeholder': 'Access password',
    'gate.checking': 'Checking…',
    'gate.enter': 'Enter',

    // Error messages (mapped from server/login codes; unknown → error.generic).
    'error.generic': 'Something went wrong.',
    'error.not_allowed':
        'This Last.fm account does not have access to the app. Ask the owner to add you to the allowlist.',
    'error.auth_failed': 'Last.fm login failed. Please try again.',
    'error.missing_token': 'Missing authorization token. Please try logging in again.',
    'error.not_logged_in': 'You are not logged in.',
    'error.no_matches': 'No albums match these filters. Try loosening them.',
    'error.pick_failed': 'Could not pick an album right now. Please try again.',
    'error.wrong_password': 'Wrong password.',
    'error.too_many_attempts': 'Too many attempts. Try again later.',
    'error.gate_failed': 'Could not enter.',
};

const pl: Dict = {
    loading: 'Ładowanie…',

    'loggedOut.title': 'Czego posłuchać?',
    'loggedOut.subtitle':
        'Zaloguj się kontem Last.fm, a my wybierzemy konkretny album do odsłuchania — czasem ulubiony klasyk, czasem coś nowego od artysty podobnego do Twoich.',
    login: 'Zaloguj przez Last.fm',

    'mode.aria': 'Tryb',
    'mode.lastfm': 'Dla mnie',
    'mode.search': 'Szukaj albumu',

    'loggedIn.title': 'Cześć, {username}',
    'loggedIn.subtitle':
        'Ustaw balans i odbierz kolejny album. Im więcej „odkrywania”, tym częściej proponujemy coś nowego spoza Twojej historii.',

    'search.title': 'Szukaj albumu',
    'search.subtitle':
        'Wybierz gatunek, dekadę i kraj — wylosujemy lubiany album z Discogs. Konto Last.fm nie jest potrzebne.',

    'filter.reset': 'Wyczyść',
    'filter.genre': 'Gatunek',
    'filter.decade': 'Dekada',
    'filter.country': 'Kraj',
    'genre.placeholder': 'Dowolny gatunek',
    'decade.placeholder': 'Dowolna dekada',
    'country.placeholder': 'Dowolny kraj',

    'country.british': 'Wielka Brytania',
    'country.american': 'USA',
    'country.polish': 'Polska',
    'country.german': 'Niemcy',
    'country.french': 'Francja',
    'country.japanese': 'Japonia',
    'country.brazilian': 'Brazylia',
    'country.italian': 'Włochy',
    'country.spanish': 'Hiszpania',

    'slider.favorites': 'Ulubione',
    'slider.discovery': 'Odkrywanie',
    'slider.aria': 'Balans między ulubionymi a odkrywaniem',

    'btn.next': 'Następny album',
    'btn.rolling': 'Losuję…',
    'btn.lock': 'Zablokuj',
    'btn.logout': 'Wyloguj',

    'hint.default': 'Ustaw balans i kliknij „Następny album”.',
    'hint.search': 'Ustaw filtry (lub zostaw puste) i kliknij „Następny album”.',

    'card.discovery': 'Odkrycie',
    'card.favorites': 'Z ulubionych',
    'card.search': 'Wyszukiwanie',
    'card.coverAlt': 'Okładka: {name}',
    'card.save': 'Zapisz album',
    'card.unsave': 'Usuń z zapisanych',

    'history.title': 'Ostatnie',
    'history.saved': 'Zapisane',
    'history.remove': 'Usuń',

    'reason.rediscovery': 'Z Twoich ulubionych — odtworzono {playcount}×.',
    'reason.discovery': 'Coś nowego — podobne do „{seed}”, którego słuchasz.',
    'reason.rediscovery_filtered': 'Z Twoich ulubionych ({scope}) — odtworzono {playcount}×.',
    'reason.discovery_filtered': 'Coś nowego ({scope}) — podobne do „{seed}”.',
    'reason.discovery_filtered_noseed': 'Coś nowego ({scope}).',
    'reason.scope_now': 'w tym tygodniu',
    'reason.rediscovery_genre': 'Z Twoich ulubionych w {genre} — odtworzono {playcount}×.',
    'reason.discovery_genre': 'Coś nowego w {genre}.',
    'reason.current_favorite': 'Z tego, czym żyjesz w tym tygodniu — odtworzono {playcount}×.',
    'reason.current_discovery': 'Świeży typ od „{seed}”, którego słuchasz w tym tygodniu.',
    'reason.search': 'Pasuje do: {scope} — w kolekcjach {have} osób na Discogs.',
    'reason.search_noscope': 'Popularny na Discogs — w kolekcjach {have} osób.',

    'theme.toLight': 'Przełącz na jasny motyw',
    'theme.toDark': 'Przełącz na ciemny motyw',
    'lang.aria': 'Język',

    'footer.poweredBy': 'Napędzane przez AudioScrobbler / Last.fm',
    'footer.discogs': 'Dane wyszukiwania albumów dostarcza Discogs',

    'gate.title': 'Dostęp ograniczony',
    'gate.subtitle':
        'Ta aplikacja jest dostępna tylko dla zaproszonych osób. Podaj hasło dostępu, aby kontynuować.',
    'gate.placeholder': 'Hasło dostępu',
    'gate.checking': 'Sprawdzam…',
    'gate.enter': 'Wejdź',

    'error.generic': 'Coś poszło nie tak.',
    'error.not_allowed':
        'To konto Last.fm nie ma dostępu do aplikacji. Poproś właściciela o dodanie Cię do listy dozwolonych.',
    'error.auth_failed': 'Logowanie Last.fm nie powiodło się. Spróbuj ponownie.',
    'error.missing_token': 'Brak tokenu autoryzacji. Spróbuj zalogować się ponownie.',
    'error.not_logged_in': 'Nie jesteś zalogowany.',
    'error.no_matches': 'Brak albumów pasujących do tych filtrów. Poluzuj je.',
    'error.pick_failed': 'Nie udało się teraz wybrać albumu. Spróbuj ponownie.',
    'error.wrong_password': 'Błędne hasło.',
    'error.too_many_attempts': 'Zbyt wiele prób. Spróbuj ponownie później.',
    'error.gate_failed': 'Nie udało się wejść.',
};

export const dictionaries: Record<Lang, Dict> = { en, pl };

export function translate(lang: Lang, key: string, params?: TranslateParams): string {
    const template = dictionaries[lang][key] ?? dictionaries.en[key] ?? key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (_, name) =>
        name in params ? String(params[name]) : `{${name}}`,
    );
}

export function detectLang(): Lang {
    if (typeof navigator === 'undefined') return 'en';
    return navigator.language?.toLowerCase().startsWith('pl') ? 'pl' : 'en';
}

export type TFn = (key: string, params?: TranslateParams) => string;

/**
 * Localized label for a filter tag (countries are translated, genres/decades are
 * names). Tags no longer offered (e.g. moods in old history) show as is.
 */
function tagLabel(t: TFn, tag: string): string {
    if (getCountry(tag)) return t(`country.${tag}`);
    return getGenre(tag)?.label ?? getDecade(tag)?.label ?? tag;
}

/** Human phrase describing the applied filters, e.g. "Rock, Jazz · this week". */
function filterScope(t: TFn, filters: string[], now: boolean): string {
    const parts: string[] = [];
    if (filters.length > 0) parts.push(filters.map((f) => tagLabel(t, f)).join(', '));
    if (now) parts.push(t('reason.scope_now'));
    return parts.join(' · ');
}

/** Translate a structured (or legacy string) recommendation reason. */
export function formatReason(t: TFn, reason: AlbumReason | string): string {
    if (typeof reason === 'string') return reason; // legacy cached albums
    switch (reason.kind) {
        case 'rediscovery':
            return t('reason.rediscovery', { playcount: reason.playcount });
        case 'discovery':
            return t('reason.discovery', { seed: reason.seedName });
        case 'rediscovery_filtered':
            return t('reason.rediscovery_filtered', {
                scope: filterScope(t, reason.filters, reason.now),
                playcount: reason.playcount,
            });
        case 'discovery_filtered': {
            const scope = filterScope(t, reason.filters, reason.now);
            return reason.seedName
                ? t('reason.discovery_filtered', { scope, seed: reason.seedName })
                : t('reason.discovery_filtered_noseed', { scope });
        }
        case 'search': {
            const have = reason.have;
            return reason.filters.length > 0
                ? t('reason.search', { scope: filterScope(t, reason.filters, false), have })
                : t('reason.search_noscope', { have });
        }
        case 'rediscovery_genre':
            return t('reason.rediscovery_genre', {
                genre: reason.genre,
                playcount: reason.playcount,
            });
        case 'discovery_genre':
            return t('reason.discovery_genre', { genre: reason.genre });
        case 'current_favorite':
            return t('reason.current_favorite', { playcount: reason.playcount });
        case 'current_discovery':
            return t('reason.current_discovery', { seed: reason.seedName });
    }
}

/** Map an error code (from server or login query param) to a localized message. */
export function errorMessage(t: TFn, code: string | null | undefined): string {
    if (!code) return t('error.generic');
    const key = `error.${code}`;
    const dict = dictionaries.en;
    return key in dict ? t(key) : t('error.generic');
}
