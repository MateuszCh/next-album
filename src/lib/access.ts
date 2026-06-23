// Last.fm username allowlist. When ALLOWED_LASTFM_USERS is empty, every
// logged-in user has access (allowlist disabled).

export function isAllowlistEnabled(): boolean {
    return Boolean(process.env.ALLOWED_LASTFM_USERS && process.env.ALLOWED_LASTFM_USERS.trim());
}

export function isUserAllowed(username: string): boolean {
    const raw = process.env.ALLOWED_LASTFM_USERS;
    if (!raw || !raw.trim()) return true;
    const allowed = raw
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
    return allowed.includes(username.trim().toLowerCase());
}
