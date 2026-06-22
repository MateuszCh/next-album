// Shared constants/helpers for the Last.fm OAuth login flow.

/** Short-lived cookie binding a login attempt to its callback (login-CSRF). */
export const OAUTH_NONCE_COOKIE = "next_album_oauth_nonce";

/** Constant-time string comparison (timing-safe). */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
