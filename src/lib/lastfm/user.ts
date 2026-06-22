import { lastfmGet } from "./client";
import type {
  LastfmTopAlbum,
  LastfmTopArtist,
  LastfmRecentTrack,
  LastfmImage,
} from "./types";

export function pickImage(images: LastfmImage[] | undefined): string | null {
  if (!images || images.length === 0) return null;
  const order: LastfmImage["size"][] = [
    "mega",
    "extralarge",
    "large",
    "medium",
    "small",
  ];
  for (const size of order) {
    const found = images.find((i) => i.size === size && i["#text"]);
    if (found) return found["#text"];
  }
  const any = images.find((i) => i["#text"]);
  return any ? any["#text"] : null;
}

type Period = "overall" | "7day" | "1month" | "3month" | "6month" | "12month";

interface TopAlbumsResponse {
  topalbums?: {
    album: LastfmTopAlbum[];
    "@attr"?: { totalPages: string; page: string };
  };
}

/**
 * Fetches the user's top albums, paginating up to the limit.
 */
export async function getTopAlbums(
  username: string,
  { period = "overall", limit = 500 }: { period?: Period; limit?: number } = {},
): Promise<LastfmTopAlbum[]> {
  const perPage = 200;
  const result: LastfmTopAlbum[] = [];
  let page = 1;
  while (result.length < limit) {
    const data = await lastfmGet<TopAlbumsResponse>("user.getTopAlbums", {
      user: username,
      period,
      limit: perPage,
      page,
    });
    const albums = data.topalbums?.album ?? [];
    result.push(...albums);
    const totalPages = Number(data.topalbums?.["@attr"]?.totalPages ?? "1");
    if (page >= totalPages || albums.length === 0) break;
    page += 1;
  }
  return result.slice(0, limit);
}

interface TopArtistsResponse {
  topartists?: {
    artist: LastfmTopArtist[];
    "@attr"?: { totalPages: string; page: string };
  };
}

export async function getTopArtists(
  username: string,
  { period = "overall", limit = 200 }: { period?: Period; limit?: number } = {},
): Promise<LastfmTopArtist[]> {
  const perPage = 200;
  const result: LastfmTopArtist[] = [];
  let page = 1;
  while (result.length < limit) {
    const data = await lastfmGet<TopArtistsResponse>("user.getTopArtists", {
      user: username,
      period,
      limit: perPage,
      page,
    });
    const artists = data.topartists?.artist ?? [];
    result.push(...artists);
    const totalPages = Number(data.topartists?.["@attr"]?.totalPages ?? "1");
    if (page >= totalPages || artists.length === 0) break;
    page += 1;
  }
  return result.slice(0, limit);
}

interface RecentTracksResponse {
  recenttracks?: { track: LastfmRecentTrack[] };
}

/**
 * Recently played tracks — used to filter out freshly played albums.
 */
export async function getRecentTracks(
  username: string,
  limit = 200,
): Promise<LastfmRecentTrack[]> {
  const data = await lastfmGet<RecentTracksResponse>("user.getRecentTracks", {
    user: username,
    limit,
  });
  return data.recenttracks?.track ?? [];
}

interface UserInfoResponse {
  user?: { name: string; image: LastfmImage[]; url: string };
}

export async function getUserInfo(
  username: string,
): Promise<{ name: string; imageUrl: string | null; url: string }> {
  const data = await lastfmGet<UserInfoResponse>("user.getInfo", {
    user: username,
  });
  return {
    name: data.user?.name ?? username,
    imageUrl: pickImage(data.user?.image),
    url: data.user?.url ?? `https://www.last.fm/user/${username}`,
  };
}
