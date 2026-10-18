// Lightweight client-side i18n: a flat dictionary per language plus a tiny
// interpolating lookup. No dependency — mirrors the existing localStorage-driven
// preferences (theme, discovery, …).

import { getGenre } from '@/lib/recommend/genres';
import { getDecade } from '@/lib/recommend/decades';
import { getCountry } from '@/lib/recommend/countries';
import type { Skin } from '@/lib/skin';

export type Lang = 'pl' | 'en';

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

    'link.title': 'Connect Last.fm',
    'link.subtitle':
        "Connect your Last.fm account and we'll pick albums from your listening — your history and saved albums stay in this account.",
    'link.button': 'Connect Last.fm',

    'loginPage.subtitle':
        'An account keeps your history and saved albums across devices. Albums you rolled before logging in are added to it.',
    'loginPage.lastfm': 'With Last.fm',
    'loginPage.lastfmNote': 'Unlocks the “For me” mode — picks based on what you listen to.',
    'loginPage.or': 'or',
    'loginPage.email': 'With email',
    'loginPage.tab.login': 'Log in',
    'loginPage.tab.register': 'Create account',
    'loginPage.emailPlaceholder': 'Email',
    'loginPage.emailExample': 'you@example.com',
    'loginPage.passwordPlaceholder': 'Password',
    'loginPage.passwordHint': 'At least {min} characters.',
    'loginPage.submitLogin': 'Log in',
    'loginPage.submitRegister': 'Create account',
    'loginPage.working': 'One moment…',

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
    'filter.presets': 'Presets',
    'filter.more': 'More',
    'filter.less': 'Less',
    'filter.showAll': 'Show all genres',
    'genre.any': 'any',
    'decade.any': 'Any',
    'country.any': 'Any',

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
    'btn.logout': 'Log out',

    'hint.default': 'Set the balance and click “Next Album”.',
    'hint.search': 'Set the filters (or leave them empty) and click “Next Album”.',

    'card.discovery': 'Discovery',
    'card.favorites': 'From favorites',
    'card.search': 'Search',
    'card.coverAlt': 'Cover: {name}',
    'card.save': 'Save album',
    'card.unsave': 'Remove from saved',

    'nav.aria': 'Main menu',
    'nav.pick': 'Pick',
    'nav.history': 'History',
    'nav.saved': 'Saved',
    'nav.account': 'Account',

    'mode.searchShort': 'Search',

    'draw.settings': 'Pick settings',
    'draw.filters': 'Search filters',
    'draw.empty': 'Your album will show up here',
    'draw.mood': 'Pick mood',
    'draw.howNew': 'How much new?',
    'balance.tape': 'Balance · tape',
    'balance.eq': 'Balance · EQ',
    'listen.aria': 'Listen on',
    'key.save': 'Save',
    'key.saved': 'Saved',
    'key.balance': 'Balance',
    'key.filters': 'Filters',
    'lcd.aria': 'Now picked',
    'lcd.mode': 'Mode: {mode}',
    'lcd.noSignal': 'No signal',
    'lcd.tuning': 'Tuning…',
    'tuner.tuning': 'Tuning',

    // Plural forms are picked with Intl.PluralRules (`countLabel`).
    'count.albums.one': '{count} album',
    'count.albums.other': '{count} albums',
    'count.tapes.one': '{count} tape',
    'count.tapes.other': '{count} tapes',
    'count.tracks.one': '{count} track',
    'count.tracks.other': '{count} tracks',
    'count.records.one': '{count} record',
    'count.records.other': '{count} records',

    'history.filter.aria': 'History filter',
    'history.filter.all': 'All',
    'history.filter.lastfm': 'For me',
    'history.filter.search': 'Search',
    'history.empty': 'Albums you pick will show up here.',
    'history.emptyFilter': 'Nothing here for this filter yet.',
    'history.sideA': 'side A',
    'history.sideB': 'side B',

    'saved.remove': 'Remove from saved: {name}',
    'saved.empty': 'No saved albums yet.',
    'saved.hint': 'Save albums with the star on the Pick screen or in History.',
    'saved.hintKey': 'Save albums with the Save key on the Pick screen or in History.',

    'account.tab.aria': 'Account',
    'account.tab.profile': 'Profile',
    'account.tab.login': 'Log in',
    'account.tab.settings': 'Settings',
    'account.viaLastfm': 'Logged in with Last.fm',
    'account.viaEmail': 'Logged in with email',
    'account.connections': 'Connections',
    'account.lastfmActive': 'The “For me” mode is on',
    'account.lastfmInactive': 'Connect it to unlock the “For me” mode',
    'account.connected': 'Connected',
    'account.connect': 'Connect',
    'account.syncNote':
        'Your history and saved albums are stored in your account — you’ll see them on every device.',
    'account.lock': 'Lock the app',
    'account.notLoggedIn': 'Not logged in',
    'account.guestNote':
        'Without an account the album search works as usual — your history and saved albums stay in this browser.',

    'settings.style': 'App style',
    'settings.looks': 'Look and language',
    'settings.theme': 'Theme',
    'settings.dark': 'Dark',
    'settings.light': 'Light',
    'settings.language': 'Language',
    'settings.modesNote':
        'Only Cover comes in dark and light. The other styles have one fixed theme, so the switch is off for them.',
    'settings.guestNote': 'Works without logging in — we remember your choice in this browser.',
    'settings.about': 'About',

    'style.okladka': 'Cover',
    'style.tuner': 'Tuner',
    'style.kaseta': 'Cassette',
    'style.rave': 'Rave',
    'style.guma': 'Bubblegum',
    'style.ambient': 'Ambient',
    'style.modes.both': 'Dark or light',
    'style.modes.dark': 'Dark only',
    'style.modes.light': 'Light only',

    'lang.name.pl': 'Polski',
    'lang.name.en': 'English',

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

    'footer.poweredBy': 'Powered by AudioScrobbler / Last.fm',
    'footer.discogs': 'Album search data provided by Discogs',

    'gate.title': 'Access restricted',
    'gate.subtitle':
        'This app is available only to invited people. Enter the access password to continue.',
    'gate.password': 'Access password',
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
    'error.invalid_email': 'Enter a valid email address.',
    'error.weak_password': 'The password must be 8–200 characters long.',
    'error.email_taken': 'An account with this email already exists. Log in instead.',
    'error.wrong_credentials': 'Wrong email or password.',
    'error.lastfm_taken': 'This Last.fm account is already connected to another account.',
    'error.server_error': 'Something went wrong on our side. Please try again.',
};

const pl: Dict = {
    loading: 'Ładowanie…',

    'loggedOut.title': 'Czego posłuchać?',
    'loggedOut.subtitle':
        'Zaloguj się kontem Last.fm, a my wybierzemy konkretny album do odsłuchania — czasem ulubiony klasyk, czasem coś nowego od artysty podobnego do Twoich.',
    login: 'Zaloguj przez Last.fm',

    'link.title': 'Połącz z Last.fm',
    'link.subtitle':
        'Połącz konto Last.fm, a my wybierzemy albumy na podstawie tego, czego słuchasz — historia i zapisane albumy zostają na tym koncie.',
    'link.button': 'Połącz z Last.fm',

    'loginPage.subtitle':
        'Konto przechowuje historię i zapisane albumy na wszystkich urządzeniach. Albumy wylosowane przed zalogowaniem zostaną do niego dodane.',
    'loginPage.lastfm': 'Przez Last.fm',
    'loginPage.lastfmNote':
        'Odblokowuje tryb „Dla mnie” — propozycje na podstawie tego, czego słuchasz.',
    'loginPage.or': 'lub',
    'loginPage.email': 'Przez e-mail',
    'loginPage.tab.login': 'Logowanie',
    'loginPage.tab.register': 'Załóż konto',
    'loginPage.emailPlaceholder': 'E-mail',
    'loginPage.emailExample': 'ty@przyklad.pl',
    'loginPage.passwordPlaceholder': 'Hasło',
    'loginPage.passwordHint': 'Co najmniej {min} znaków.',
    'loginPage.submitLogin': 'Zaloguj się',
    'loginPage.submitRegister': 'Załóż konto',
    'loginPage.working': 'Chwileczkę…',

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
    'filter.presets': 'Presety',
    'filter.more': 'Więcej',
    'filter.less': 'Mniej',
    'filter.showAll': 'Pokaż wszystkie gatunki',
    'genre.any': 'dowolny',
    'decade.any': 'Dowolna',
    'country.any': 'Dowolny',

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
    'btn.logout': 'Wyloguj',

    'hint.default': 'Ustaw balans i kliknij „Następny album”.',
    'hint.search': 'Ustaw filtry (lub zostaw puste) i kliknij „Następny album”.',

    'card.discovery': 'Odkrycie',
    'card.favorites': 'Z ulubionych',
    'card.search': 'Wyszukiwanie',
    'card.coverAlt': 'Okładka: {name}',
    'card.save': 'Zapisz album',
    'card.unsave': 'Usuń z zapisanych',

    'nav.aria': 'Menu główne',
    'nav.pick': 'Losuj',
    'nav.history': 'Historia',
    'nav.saved': 'Ulubione',
    'nav.account': 'Konto',

    'mode.searchShort': 'Szukaj',

    'draw.settings': 'Ustawienia losowania',
    'draw.filters': 'Filtry wyszukiwania',
    'draw.empty': 'Tu pojawi się Twój album',
    'draw.mood': 'Nastrój losowania',
    'draw.howNew': 'Ile nowości?',
    'balance.tape': 'Balans · taśma',
    'balance.eq': 'Balans · EQ',
    'listen.aria': 'Słuchaj w',
    'key.save': 'Zapisz',
    'key.saved': 'Zapisano',
    'key.balance': 'Balans',
    'key.filters': 'Filtry',
    'lcd.aria': 'Teraz wylosowany',
    'lcd.mode': 'Tryb: {mode}',
    'lcd.noSignal': 'Brak sygnału',
    'lcd.tuning': 'Strojenie…',
    'tuner.tuning': 'Strojenie',

    'count.albums.one': '{count} album',
    'count.albums.few': '{count} albumy',
    'count.albums.many': '{count} albumów',
    'count.albums.other': '{count} albumu',
    'count.tapes.one': '{count} kaseta',
    'count.tapes.few': '{count} kasety',
    'count.tapes.many': '{count} kaset',
    'count.tapes.other': '{count} kasety',
    'count.tracks.one': '{count} track',
    'count.tracks.few': '{count} tracki',
    'count.tracks.many': '{count} tracków',
    'count.tracks.other': '{count} tracka',
    'count.records.one': '{count} płyta',
    'count.records.few': '{count} płyty',
    'count.records.many': '{count} płyt',
    'count.records.other': '{count} płyty',

    'history.filter.aria': 'Filtr historii',
    'history.filter.all': 'Wszystkie',
    'history.filter.lastfm': 'Dla mnie',
    'history.filter.search': 'Szukaj',
    'history.empty': 'Tu pojawią się wylosowane albumy.',
    'history.emptyFilter': 'W tym filtrze nic jeszcze nie ma.',
    'history.sideA': 'strona A',
    'history.sideB': 'strona B',

    'saved.remove': 'Usuń z ulubionych: {name}',
    'saved.empty': 'Nie masz jeszcze zapisanych albumów.',
    'saved.hint': 'Zapisuj albumy gwiazdką na ekranie Losuj albo w Historii.',
    'saved.hintKey': 'Zapisuj albumy klawiszem Zapisz na ekranie Losuj albo w Historii.',

    'account.tab.aria': 'Konto',
    'account.tab.profile': 'Profil',
    'account.tab.login': 'Zaloguj się',
    'account.tab.settings': 'Ustawienia',
    'account.viaLastfm': 'Zalogowano przez Last.fm',
    'account.viaEmail': 'Zalogowano przez e-mail',
    'account.connections': 'Połączenia',
    'account.lastfmActive': 'Tryb „Dla mnie” jest aktywny',
    'account.lastfmInactive': 'Połącz, aby odblokować tryb „Dla mnie”',
    'account.connected': 'Połączono',
    'account.connect': 'Połącz',
    'account.syncNote':
        'Historia i ulubione są zapisane na koncie — zobaczysz je na każdym urządzeniu.',
    'account.lock': 'Zablokuj aplikację',
    'account.notLoggedIn': 'Niezalogowany',
    'account.guestNote':
        'Bez konta wyszukiwarka albumów działa normalnie — historia i ulubione zostają w tej przeglądarce.',

    'settings.style': 'Styl aplikacji',
    'settings.looks': 'Wygląd i język',
    'settings.theme': 'Motyw',
    'settings.dark': 'Ciemny',
    'settings.light': 'Jasny',
    'settings.language': 'Język',
    'settings.modesNote':
        'Ciemny i jasny motyw ma tylko Okładka. Pozostałe style mają jeden stały motyw — przełącznik jest wtedy wyłączony.',
    'settings.guestNote': 'Działa bez logowania — wybór zapamiętujemy w tej przeglądarce.',
    'settings.about': 'O aplikacji',

    'style.okladka': 'Okładka',
    'style.tuner': 'Tuner',
    'style.kaseta': 'Kaseta',
    'style.rave': 'Rave',
    'style.guma': 'Guma',
    'style.ambient': 'Ambient',
    'style.modes.both': 'Ciemny lub jasny',
    'style.modes.dark': 'Tylko ciemny',
    'style.modes.light': 'Tylko jasny',

    'lang.name.pl': 'Polski',
    'lang.name.en': 'English',

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

    'footer.poweredBy': 'Napędzane przez AudioScrobbler / Last.fm',
    'footer.discogs': 'Dane wyszukiwania albumów dostarcza Discogs',

    'gate.title': 'Dostęp ograniczony',
    'gate.subtitle':
        'Ta aplikacja jest dostępna tylko dla zaproszonych osób. Podaj hasło dostępu, aby kontynuować.',
    'gate.password': 'Hasło dostępu',
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
    'error.invalid_email': 'Podaj poprawny adres e-mail.',
    'error.weak_password': 'Hasło musi mieć od 8 do 200 znaków.',
    'error.email_taken': 'Konto z tym adresem e-mail już istnieje. Zaloguj się.',
    'error.wrong_credentials': 'Błędny e-mail lub hasło.',
    'error.lastfm_taken': 'To konto Last.fm jest już połączone z innym kontem.',
    'error.server_error': 'Coś poszło nie tak po naszej stronie. Spróbuj ponownie.',
};

export const dictionaries: Record<Lang, Dict> = { en, pl };

export function translate(lang: Lang, key: string, params?: TranslateParams): string {
    const template = dictionaries[lang][key] ?? dictionaries.en[key] ?? key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (_, name) =>
        name in params ? String(params[name]) : `{${name}}`,
    );
}

/** The noun a skin counts albums in on Historia / Ulubione ("12 kaset", "12 płyt"). */
export const COUNT_NOUN: Record<Skin, string> = {
    okladka: 'count.albums',
    tuner: 'count.albums',
    kaseta: 'count.tapes',
    rave: 'count.tracks',
    ambient: 'count.albums',
    guma: 'count.records',
};

/**
 * A count with the right plural form, e.g. `countLabel(t, lang, 'count.albums', 5)`
 * → "5 albumów". Looks up `<key>.<category>` (Intl.PluralRules: one / few /
 * many / other), falling back to `<key>.other`.
 */
export function countLabel(t: TFn, lang: Lang, key: string, count: number): string {
    const category = new Intl.PluralRules(lang).select(count);
    const formKey = `${key}.${category}`;
    return t(formKey in dictionaries[lang] ? formKey : `${key}.other`, { count });
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
