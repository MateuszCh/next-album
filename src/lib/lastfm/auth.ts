import { lastfmSignedGet, getApiKey } from "./client";

const AUTH_URL = "https://www.last.fm/api/auth/";

/**
 * The URL we redirect the user to so they can log in with Last.fm.
 */
export function buildAuthUrl(callbackUrl: string): string {
  const params = new URLSearchParams({
    api_key: getApiKey(),
    cb: callbackUrl,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

interface GetSessionResponse {
  session: {
    name: string;
    key: string;
    subscriber: number;
  };
}

/**
 * Exchanges the token (from the callback) for a persistent session key + username.
 */
export async function getSession(
  token: string,
): Promise<{ username: string; sessionKey: string }> {
  const data = await lastfmSignedGet<GetSessionResponse>("auth.getSession", {
    token,
  });
  return { username: data.session.name, sessionKey: data.session.key };
}
