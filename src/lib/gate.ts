// Password gate in front of the whole app. The gate cookie stores a token =
// HMAC of a constant value keyed by the access password, so it can't be forged
// without knowing the password, and the password itself never lands in the
// cookie. The logic works in both the Node runtime (route handler) and Edge
// (middleware) — it uses Web Crypto.

export const GATE_COOKIE = "next_album_gate";

/** Whether the gate is enabled (ACCESS_PASSWORD is configured). */
export function isGateEnabled(): boolean {
  return Boolean(process.env.ACCESS_PASSWORD && process.env.ACCESS_PASSWORD.trim());
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Deterministic gate token for the current password. Changing the password
 * invalidates all previously issued cookies.
 */
export async function gateToken(): Promise<string> {
  const password = process.env.ACCESS_PASSWORD ?? "";
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

/** Constant-time token comparison. */
export function tokensEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
