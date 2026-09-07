import Link from "next/link";
import { getEnvStatus, OPTIONAL_ENV_KEYS } from "@/lib/env";

export const dynamic = "force-dynamic";

const ENV_HELP: Record<string, string> = {
  SESSION_SECRET: "Mindst 32 tegn. Bruges til iron-session cookies.",
  TURSO_DATABASE_URL: "libsql://… eller https://… (Turso database).",
  TURSO_AUTH_TOKEN: "Auth-token fra Turso dashboard.",
  BLOB_READ_WRITE_TOKEN: "Valgfri — Vercel Blob til billeder.",
};

export default function SetupPage() {
  const status = getEnvStatus();

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <div style={{ color: "var(--accent)", fontWeight: 800, fontSize: "1.25rem" }}>
            Højfynsspartel
          </div>
          <div className="hint">Opsætning — miljøvariabler</div>
        </div>
      </header>

      <section className="card stack">
        <h1 style={{ margin: 0, fontSize: "1.35rem" }}>Vercel-miljø mangler</h1>
        <p className="hint" style={{ margin: 0 }}>
          Appen kører ikke korrekt før obligatoriske env-variabler er sat i Vercel.
          Ingen hemmeligheder vises her.
        </p>

        <div>
          <strong>Status</strong>
          <ul className="hint" style={{ margin: "0.5rem 0 0", paddingLeft: "1.2rem" }}>
            <li>
              SESSION_SECRET:{" "}
              {status.hasSessionSecret ? (
                <span style={{ color: "var(--ok)" }}>OK (≥32 tegn)</span>
              ) : (
                <span style={{ color: "var(--danger)" }}>mangler / for kort</span>
              )}
            </li>
            <li>
              Turso:{" "}
              {status.hasTurso ? (
                <span style={{ color: "var(--ok)" }}>OK</span>
              ) : (
                <span style={{ color: "var(--danger)" }}>
                  mangler (uden Turso er data midlertidig i /tmp på Vercel)
                </span>
              )}
            </li>
            <li>Platform: {status.onVercel ? "Vercel" : "lokal"}</li>
          </ul>
        </div>

        <div>
          <strong>Påkrævet</strong>
          <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.2rem" }}>
            {(["SESSION_SECRET", "TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN"] as const).map(
              (key) => {
                const missing = status.missing.includes(key);
                const okSession = key === "SESSION_SECRET" && status.hasSessionSecret;
                const okTurso =
                  (key === "TURSO_DATABASE_URL" || key === "TURSO_AUTH_TOKEN") &&
                  status.hasTurso;
                const done = okSession || okTurso || (!missing && key !== "SESSION_SECRET");
                return (
                  <li key={key} className="hint" style={{ marginBottom: "0.4rem" }}>
                    <code style={{ color: "var(--cream)" }}>{key}</code>
                    {" — "}
                    {ENV_HELP[key]}
                    {done ? (
                      <span style={{ color: "var(--ok)" }}> ✓</span>
                    ) : (
                      <span style={{ color: "var(--danger)" }}> (mangler)</span>
                    )}
                  </li>
                );
              },
            )}
          </ul>
        </div>

        <div>
          <strong>Valgfri</strong>
          <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.2rem" }}>
            {OPTIONAL_ENV_KEYS.map((key) => (
              <li key={key} className="hint">
                <code style={{ color: "var(--cream)" }}>{key}</code>
                {" — "}
                {ENV_HELP[key]}
              </li>
            ))}
          </ul>
        </div>

        <div className="card" style={{ background: "#1a1a1a" }}>
          <strong>Sådan sætter du env i Vercel</strong>
          <ol className="hint" style={{ margin: "0.5rem 0 0", paddingLeft: "1.2rem" }}>
            <li>Åbn projektet i Vercel Dashboard</li>
            <li>
              Gå til <strong>Settings → Environment Variables</strong>
            </li>
            <li>
              Tilføj <code>SESSION_SECRET</code> (≥32 tegn),{" "}
              <code>TURSO_DATABASE_URL</code>, <code>TURSO_AUTH_TOKEN</code>
            </li>
            <li>
              Valgfrit: <code>BLOB_READ_WRITE_TOKEN</code>
            </li>
            <li>
              <strong>Redeploy</strong> (Deployments → … → Redeploy)
            </li>
          </ol>
          <p style={{ marginTop: "0.75rem" }}>
            <a
              href="https://vercel.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
            >
              Åbn Vercel Dashboard →
            </a>
          </p>
        </div>

        {status.ok ? (
          <p className="hint" style={{ margin: 0 }}>
            SESSION_SECRET er sat. Du kan{" "}
            <Link href="/login">gå til login</Link>
            {!status.hasTurso
              ? " — bemærk: uden Turso virker demoen midlertidigt (data forsvinder ved cold start)."
              : "."}
          </p>
        ) : (
          <p className="hint" style={{ margin: 0, color: "var(--danger)" }}>
            Sæt mindst SESSION_SECRET, og redeploy, før login virker.
          </p>
        )}
      </section>

      <p className="hint" style={{ marginTop: "1rem" }}>
        <Link href="/projekter">Offentlige projekter</Link>
        {" · "}
        <Link href="/">Forside</Link>
      </p>
    </main>
  );
}
