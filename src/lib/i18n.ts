// Lightweight client-side i18n: a flat dictionary per language plus a tiny
// interpolating lookup. No dependency — mirrors the existing localStorage-driven
// preferences (theme, discovery, …).

export type Lang = 'pl' | 'en';

export const LANGS: Lang[] = ['en', 'pl'];

export type TranslateParams = Record<string, string | number>;

// Structured recommendation reason — translated on the client so switching the
// language re-renders the reason of an already-shown album.
export type AlbumReason =
    | { kind: 'rediscovery'; playcount: number }
    | { kind: 'discovery'; seedName: string }
    | { kind: 'rediscovery_genre'; genre: string; playcount: number }
    | { kind: 'discovery_genre'; genre: string };

type Dict = Record<string, string>;

const en: Dict = {
    loading: 'Loading…',

    'loggedOut.title': 'What should you listen to?',
    'loggedOut.subtitle':
        "Log in with your Last.fm account and we'll pick a specific album to play — sometimes a favorite classic, sometimes something new from an artist similar to yours.",
    login: 'Log in with Last.fm',

    'loggedIn.title': 'Hi, {username}',
    'loggedIn.subtitle':
        'Set the balance and get your next album. The more “discovery”, the more often we suggest something new beyond your history.',

    'flow.surprise': 'Surprise me',
    'flow.genre': 'By genre',
    'flow.aria': 'Recommendation mode',

    'slider.favorites': 'Favorites',
    'slider.discovery': 'Discovery',
    'slider.aria': 'Balance between favorites and discovery',

    'btn.next': 'Next Album',
    'btn.rolling': 'Rolling…',
    'btn.lock': 'Lock',
    'btn.logout': 'Log out',

    'hint.surprise': 'Click “Next Album” to get a suggestion.',
    'hint.genre': 'Pick a genre to get an album.',

    'card.discovery': 'Discovery',
    'card.favorites': 'From favorites',
    'card.coverAlt': 'Cover: {name}',

    'reason.rediscovery': 'From your favorites — played {playcount}×.',
    'reason.discovery': 'Something new — similar to “{seed}”, who you listen to.',
    'reason.rediscovery_genre': 'From your favorites in {genre} — played {playcount}×.',
    'reason.discovery_genre': 'Something new in {genre}.',

    'theme.toLight': 'Switch to light theme',
    'theme.toDark': 'Switch to dark theme',
    'lang.aria': 'Language',

    'footer.poweredBy': 'Powered by AudioScrobbler / Last.fm',

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
    'error.unknown_genre': 'Unknown genre.',
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

    'loggedIn.title': 'Cześć, {username}',
    'loggedIn.subtitle':
        'Ustaw balans i odbierz kolejny album. Im więcej „odkrywania”, tym częściej proponujemy coś nowego spoza Twojej historii.',

    'flow.surprise': 'Zaskocz mnie',
    'flow.genre': 'Wg gatunku',
    'flow.aria': 'Tryb rekomendacji',

    'slider.favorites': 'Ulubione',
    'slider.discovery': 'Odkrywanie',
    'slider.aria': 'Balans między ulubionymi a odkrywaniem',

    'btn.next': 'Następny album',
    'btn.rolling': 'Losuję…',
    'btn.lock': 'Zablokuj',
    'btn.logout': 'Wyloguj',

    'hint.surprise': 'Kliknij „Następny album”, aby otrzymać propozycję.',
    'hint.genre': 'Wybierz gatunek, aby otrzymać album.',

    'card.discovery': 'Odkrycie',
    'card.favorites': 'Z ulubionych',
    'card.coverAlt': 'Okładka: {name}',

    'reason.rediscovery': 'Z Twoich ulubionych — odtworzono {playcount}×.',
    'reason.discovery': 'Coś nowego — podobne do „{seed}”, którego słuchasz.',
    'reason.rediscovery_genre': 'Z Twoich ulubionych w {genre} — odtworzono {playcount}×.',
    'reason.discovery_genre': 'Coś nowego w {genre}.',

    'theme.toLight': 'Przełącz na jasny motyw',
    'theme.toDark': 'Przełącz na ciemny motyw',
    'lang.aria': 'Język',

    'footer.poweredBy': 'Napędzane przez AudioScrobbler / Last.fm',

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
    'error.unknown_genre': 'Nieznany gatunek.',
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

/** Translate a structured (or legacy string) recommendation reason. */
export function formatReason(t: TFn, reason: AlbumReason | string): string {
    if (typeof reason === 'string') return reason; // legacy cached albums
    switch (reason.kind) {
        case 'rediscovery':
            return t('reason.rediscovery', { playcount: reason.playcount });
        case 'discovery':
            return t('reason.discovery', { seed: reason.seedName });
        case 'rediscovery_genre':
            return t('reason.rediscovery_genre', {
                genre: reason.genre,
                playcount: reason.playcount,
            });
        case 'discovery_genre':
            return t('reason.discovery_genre', { genre: reason.genre });
    }
}

/** Map an error code (from server or login query param) to a localized message. */
export function errorMessage(t: TFn, code: string | null | undefined): string {
    if (!code) return t('error.generic');
    const key = `error.${code}`;
    const dict = dictionaries.en;
    return key in dict ? t(key) : t('error.generic');
}
