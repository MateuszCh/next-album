// The app mode (Losuj tab): `lastfm` picks from the user's Last.fm profile
// (slider, no filters); `search` is the Discogs album search by filters — no
// Last.fm account needed. Stored as a cookie so the server renders the right
// mode on the first paint. Shared by the server layout and AppDataProvider.

export type AppMode = 'lastfm' | 'search';

export const APP_MODES: AppMode[] = ['lastfm', 'search'];

export const APP_MODE_COOKIE = 'appMode';

export function parseAppMode(value: string | null | undefined): AppMode | null {
    return value === 'lastfm' || value === 'search' ? value : null;
}
