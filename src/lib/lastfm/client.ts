import { createHash } from "crypto";
import { rateLimited } from "./limiter";

const API_ROOT = "https://ws.audioscrobbler.com/2.0/";
const USER_AGENT = "next-album/0.1 (https://github.com/)";

// Rate limit exceeded — Last.fm error code 29, or HTTP 429.
const RATE_LIMIT_CODE = 29;
const MAX_RETRIES = 3;
const BACKOFF_MS = [600, 1500, 3000];

export function getApiKey(): string {
  const key = process.env.LASTFM_API_KEY;
  if (!key) throw new Error("Missing LASTFM_API_KEY in environment.");
  return key;
}

export function getSharedSecret(): string {
  const secret = process.env.LASTFM_SHARED_SECRET;
  if (!secret) throw new Error("Missing LASTFM_SHARED_SECRET in environment.");
  return secret;
}

/**
 * api_sig per the Last.fm spec: parameters sorted alphabetically by name,
 * concatenated as "<name><value>", followed by the shared secret, all md5'd.
 * The "format" and "callback" parameters are excluded from the signature.
 */
export function signParams(
  params: Record<string, string>,
  secret = getSharedSecret(),
): string {
  const sigBase = Object.keys(params)
    .filter((k) => k !== "format" && k !== "callback")
    .sort()
    .map((k) => `${k}${params[k]}`)
    .join("");
  return createHash("md5")
    .update(sigBase + secret, "utf8")
    .digest("hex");
}

class LastfmError extends Error {
  code?: number;
  constructor(message: string, code?: number) {
    super(message);
    this.name = "LastfmError";
    this.code = code;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Performs a single HTTP request to Last.fm and parses the response,
 * turning API errors into a LastfmError.
 */
async function doFetch<T>(url: string, method: "GET" | "POST"): Promise<T> {
  const res = await fetch(url, {
    method,
    cache: "no-store",
    headers: { "User-Agent": USER_AGENT },
  });

  let data: (T & { error?: number; message?: string }) | null = null;
  try {
    data = (await res.json()) as T & { error?: number; message?: string };
  } catch {
    // e.g. HTTP 429 with no JSON body
    if (res.status === 429) {
      throw new LastfmError("Rate Limit Exceeded", RATE_LIMIT_CODE);
    }
    throw new LastfmError(`Last.fm HTTP ${res.status}`, res.status);
  }

  if (data && typeof data === "object" && "error" in data && data.error) {
    throw new LastfmError(data.message ?? "Last.fm error", data.error);
  }
  if (!res.ok) {
    const code = res.status === 429 ? RATE_LIMIT_CODE : res.status;
    throw new LastfmError(`Last.fm HTTP ${res.status}`, code);
  }
  return data as T;
}

/**
 * Runs a request through the limiter, retrying with backoff on rate-limit errors.
 */
async function request<T>(url: string, method: "GET" | "POST"): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await rateLimited(() => doFetch<T>(url, method));
    } catch (err) {
      const isRateLimit =
        err instanceof LastfmError && err.code === RATE_LIMIT_CODE;
      if (!isRateLimit || attempt >= MAX_RETRIES) throw err;
      await sleep(BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)]);
      attempt += 1;
    }
  }
}

/**
 * Unsigned GET request (public data — only api_key is needed).
 */
export async function lastfmGet<T>(
  method: string,
  params: Record<string, string | number> = {},
): Promise<T> {
  const search = new URLSearchParams({
    method,
    api_key: getApiKey(),
    format: "json",
  });
  for (const [k, v] of Object.entries(params)) {
    search.set(k, String(v));
  }
  return request<T>(`${API_ROOT}?${search.toString()}`, "GET");
}

/**
 * Signed POST request (e.g. auth.getSession).
 */
export async function lastfmSignedGet<T>(
  method: string,
  params: Record<string, string> = {},
): Promise<T> {
  const all: Record<string, string> = {
    method,
    api_key: getApiKey(),
    ...params,
  };
  const api_sig = signParams(all);
  const search = new URLSearchParams({ ...all, api_sig, format: "json" });
  return request<T>(`${API_ROOT}?${search.toString()}`, "POST");
}

export { LastfmError };
