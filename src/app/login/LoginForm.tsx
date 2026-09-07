"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password, remember }),
      });
      router.replace("/app");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login fejlede");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <div className="topbar">
        <div>
          <div style={{ color: "var(--accent)", fontWeight: 800, fontSize: "1.25rem" }}>
            Højfynsspartel
          </div>
          <div className="hint">Foto-app til før / under / efter</div>
        </div>
      </div>

      <form className="card stack" onSubmit={onSubmit}>
        <h1 style={{ margin: 0, fontSize: "1.35rem" }}>Log ind</h1>
        {error ? <div className="error">{error}</div> : null}
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="password">Adgangskode</label>
          <input
            id="password"
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <label style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <span>Husk mig (30 dage)</span>
        </label>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Logger ind…" : "Log ind"}
        </button>
      </form>

      <p className="hint" style={{ marginTop: "1rem" }}>
        Offentlige projekter: <Link href="/projekter">/projekter</Link>
        {" · "}
        <Link href="/setup">Opsætning</Link>
      </p>
    </main>
  );
}
