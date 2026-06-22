"use client";

import { useState } from "react";

export default function GatePage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not enter.");
      }
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <div className="container">
        <h1 className="title">Access restricted</h1>
        <p className="subtitle">
          This app is available only to invited people. Enter the access
          password to continue.
        </p>
        <form onSubmit={submit} className="gate-form">
          <input
            type="password"
            className="gate-input"
            placeholder="Access password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          <button
            type="submit"
            className="btn btn-primary btn-big"
            disabled={loading || !password}
          >
            {loading ? "Checking…" : "Enter"}
          </button>
        </form>
        {error && <div className="error">{error}</div>}
      </div>

      <footer className="footer">
        <a href="https://www.last.fm/" target="_blank" rel="noreferrer">
          Powered by AudioScrobbler / Last.fm
        </a>
      </footer>
    </main>
  );
}
