// Password gate in front of the whole app. The gate cookie stores a token =
// HMAC of a constant value keyed by the access password, so it can't be forged
// without knowing the password, and the password itself never lands in the
// cookie. The logic works in both the Node runtime (route handler) and Edge
// (middleware) — it uses Web Crypto.

export const GATE_COOKIE = "next_album_gate";

/** Minimum length for ACCESS_PASSWORD when the gate is enabled. */
export const MIN_ACCESS_PASSWORD_LENGTH = 8;

/** Whether the gate is enabled (ACCESS_PASSWORD is configured). */
export function isGateEnabled(): boolean {
  return Boolean(process.env.ACCESS_PASSWORD && process.env.ACCESS_PASSWORD.trim());
}

/**
 * Reads the access password, enforcing a minimum length so the gate can't be
 * protected by a trivially brute-forceable secret. Throws a clear error on
 * misconfiguration (fail closed) — mirrors the SESSION_SECRET check.
 */
export function getAccessPassword(): string {
  const password = process.env.ACCESS_PASSWORD ?? "";
  if (password.length < MIN_ACCESS_PASSWORD_LENGTH) {
    throw new Error(
      `ACCESS_PASSWORD must be at least ${MIN_ACCESS_PASSWORD_LENGTH} characters (set it in .env.local).`,
    );
  }
  return password;
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** HMAC-derives a gate token from an arbitrary password candidate. */
export async function deriveToken(password: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("granted"));
  return toHex(sig);
}

/**
 * Deterministic gate token for the current password. Changing the password
 * invalidates all previously issued cookies.
 */
export async function gateToken(): Promise<string> {
  return deriveToken(getAccessPassword());
}

/** Constant-time token comparison. */
export function tokensEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
