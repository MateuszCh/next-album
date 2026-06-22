"use client";

import { useCallback, useEffect, useState } from "react";
import { LoginButton } from "@/components/LoginButton";
import { ModeSlider } from "@/components/ModeSlider";
import { AlbumCard } from "@/components/AlbumCard";
import type { AlbumRecommendation } from "@/lib/lastfm/types";

interface Me {
  loggedIn: boolean;
  username?: string;
  imageUrl?: string | null;
}

export default function Home() {
  const [me, setMe] = useState<Me | null>(null);
  const [discovery, setDiscovery] = useState(0.4);
  const [album, setAlbum] = useState<AlbumRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data: Me) => setMe(data))
      .catch(() => setMe({ loggedIn: false }));

    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err) {
      const messages: Record<string, string> = {
        not_allowed:
          "This Last.fm account does not have access to the app. Ask the owner to add you to the allowlist.",
        auth_failed: "Last.fm login failed. Please try again.",
        missing_token: "Missing authorization token. Please try logging in again.",
      };
      setError(messages[err] ?? "A login error occurred.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const roll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/recommend?discovery=${discovery}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Server error.");
      setAlbum(data as AlbumRecommendation);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [discovery]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    // Full navigation so middleware re-checks the gate; with the gate cookie
    // cleared it redirects to /gate (access password required again).
    window.location.href = "/";
  }, []);

  return (
    <main className="page">
      <div className="topbar">
        <div className="brand">
          next<span>·</span>album
        </div>
        {me?.loggedIn && (
          <div className="user-chip">
            {me.imageUrl && <img src={me.imageUrl} alt="" />}
            <span>{me.username}</span>
            <button className="btn btn-ghost" onClick={logout}>
              Log out
            </button>
          </div>
        )}
      </div>

      <div className="container">
        {me === null ? (
          <p className="subtitle">Loading…</p>
        ) : !me.loggedIn ? (
          <>
            <h1 className="title">What should you listen to?</h1>
            <p className="subtitle">
              Log in with your Last.fm account and we&apos;ll pick a specific
              album to play — sometimes a favorite classic, sometimes something
              new from an artist similar to yours.
            </p>
            <LoginButton />
            {error && <div className="error">{error}</div>}
          </>
        ) : (
          <>
            <h1 className="title">Hi, {me.username} 👋</h1>
            <p className="subtitle">
              Set the balance and roll an album. The more &quot;discovery&quot;,
              the more often we suggest something new beyond your history.
            </p>

            <div className="controls">
              <ModeSlider
                value={discovery}
                onChange={setDiscovery}
                disabled={loading}
              />
              <button
                className="btn btn-primary btn-big"
                onClick={roll}
                disabled={loading}
              >
                {loading ? "Rolling…" : "Roll an album"}
              </button>
            </div>

            {error && <div className="error">{error}</div>}
            {album && <AlbumCard album={album} />}
            {!album && !error && (
              <p className="hint">
                Click &quot;Roll an album&quot; to get a suggestion.
              </p>
            )}
          </>
        )}
      </div>

      <footer className="footer">
        <a href="https://www.last.fm/" target="_blank" rel="noreferrer">
          Powered by AudioScrobbler / Last.fm
        </a>
      </footer>
    </main>
  );
}
