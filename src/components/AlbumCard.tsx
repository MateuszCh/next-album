import type { AlbumRecommendation } from "@/lib/lastfm/types";

const searchUrl = (artist: string, album: string, service: "spotify" | "ytm") => {
  const q = encodeURIComponent(`${artist} ${album}`);
  return service === "spotify"
    ? `https://open.spotify.com/search/${q}`
    : `https://music.youtube.com/search?q=${q}`;
};

export function AlbumCard({ album }: { album: AlbumRecommendation }) {
  return (
    <div className="card">
      <div className="card-cover">
        {album.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={album.imageUrl} alt={`Cover: ${album.name}`} />
        ) : (
          <div className="placeholder" aria-hidden>
            ♪
          </div>
        )}
        <span className="badge">
          {album.mode === "discovery" ? "Discovery" : "From favorites"}
        </span>
      </div>
      <div className="card-body">
        <h2 className="album-title">{album.name}</h2>
        <p className="album-artist">{album.artist}</p>
        <p className="reason">{album.reason}</p>
        <div className="card-links">
          <a
            className="btn btn-ghost"
            href={album.url}
            target="_blank"
            rel="noreferrer"
          >
            Last.fm
          </a>
          <a
            className="btn btn-ghost"
            href={searchUrl(album.artist, album.name, "spotify")}
            target="_blank"
            rel="noreferrer"
          >
            Spotify
          </a>
          <a
            className="btn btn-ghost"
            href={searchUrl(album.artist, album.name, "ytm")}
            target="_blank"
            rel="noreferrer"
          >
            YouTube Music
          </a>
        </div>
      </div>
    </div>
  );
}
