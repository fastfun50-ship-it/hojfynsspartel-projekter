import Link from "next/link";
import { getEnvStatus, OPTIONAL_ENV_KEYS } from "@/lib/env";

export const dynamic = "force-dynamic";

const ENV_HELP: Record<string, string> = {
  SESSION_SECRET: "Mindst 32 tegn. Bruges til iron-session cookies.",
  TURSO_DATABASE_URL: "libsql://… (preferér) — alias: DATABASE_URL. Durable DB.",
  TURSO_AUTH_TOKEN: "Auth-token (preferér) — alias: AUTH_TOKEN.",
  BLOB_READ_WRITE_TOKEN:
    "Alternativ til Turso på Vercel: gemmer sql.js DB + billeder i Vercel Blob.",
};

const ENV_LABEL: Record<string, string> = {
  SESSION_SECRET: "SESSION_SECRET",
  TURSO_DATABASE_URL: "TURSO_DATABASE_URL (eller DATABASE_URL)",
  TURSO_AUTH_TOKEN: "TURSO_AUTH_TOKEN (eller AUTH_TOKEN)",
  BLOB_READ_WRITE_TOKEN: "BLOB_READ_WRITE_TOKEN",
};

export default function SetupPage() {
  const status = getEnvStatus();

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <div className="brand">Højfynsspartel</div>
          <div className="hint">Opsætning — miljøvariabler</div>
        </div>
      </header>

      <section className="card stack">
        <h1 className="page-title">Vercel-miljø mangler</h1>
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
              Durable storage (Turso <em>eller</em> Blob):{" "}
              {status.hasDurableStorage ? (
                <span style={{ color: "var(--ok)" }}>
                  OK
                  {status.hasTurso
                    ? " (Turso)"
                    : status.hasBlobToken
                      ? " (Vercel Blob → sql.js)"
                      : ""}
                </span>
              ) : (
                <span style={{ color: "var(--danger)" }}>
                  mangler — SESSION_SECRET alene er ikke nok til opret→projektdetalje
                  (sql.js er midlertidig pr. isolate)
                </span>
              )}
            </li>
            <li>
              Turso/libsql:{" "}
              {status.hasTurso ? (
                <span style={{ color: "var(--ok)" }}>OK</span>
              ) : (
                <span>ikke sat</span>
              )}
            </li>
            <li>
              BLOB_READ_WRITE_TOKEN:{" "}
              {status.hasBlobToken ? (
                <span style={{ color: "var(--ok)" }}>OK</span>
              ) : (
                <span>ikke sat</span>
              )}
            </li>
            <li>Platform: {status.onVercel ? "Vercel" : "lokal"}</li>
          </ul>
        </div>

        <div>
          <strong>Påkrævet</strong>
          <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.2rem" }}>
            <li className="hint" style={{ marginBottom: "0.4rem" }}>
              <code style={{ color: "var(--cream)" }}>SESSION_SECRET</code>
              {" — "}
              {ENV_HELP.SESSION_SECRET}
              {status.hasSessionSecret ? (
                <span style={{ color: "var(--ok)" }}> ✓</span>
              ) : (
                <span style={{ color: "var(--danger)" }}> (mangler)</span>
              )}
            </li>
            <li className="hint" style={{ marginBottom: "0.4rem" }}>
              <strong>Durable demo på Vercel:</strong>{" "}
              <code style={{ color: "var(--cream)" }}>TURSO_*</code> /{" "}
              <code style={{ color: "var(--cream)" }}>DATABASE_URL</code>{" "}
              <em>eller</em>{" "}
              <code style={{ color: "var(--cream)" }}>BLOB_READ_WRITE_TOKEN</code>
              {status.hasDurableStorage ? (
                <span style={{ color: "var(--ok)" }}> ✓</span>
              ) : (
                <span style={{ color: "var(--danger)" }}> (mangler)</span>
              )}
            </li>
            {(["TURSO_DATABASE_URL", "TURSO_AUTH_TOKEN"] as const).map((key) => (
              <li key={key} className="hint" style={{ marginBottom: "0.4rem" }}>
                <code style={{ color: "var(--cream)" }}>{ENV_LABEL[key] || key}</code>
                {" — "}
                {ENV_HELP[key]}
                {status.hasTurso ? (
                  <span style={{ color: "var(--ok)" }}> ✓</span>
                ) : (
                  <span> (valgfri hvis Blob er sat)</span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <strong>Valgfri / alternativ</strong>
          <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.2rem" }}>
            {OPTIONAL_ENV_KEYS.map((key) => (
              <li key={key} className="hint">
                <code style={{ color: "var(--cream)" }}>{ENV_LABEL[key] || key}</code>
                {" — "}
                {ENV_HELP[key]}
                {status.hasBlobToken ? (
                  <span style={{ color: "var(--ok)" }}> ✓</span>
                ) : null}
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
              Tilføj <code>SESSION_SECRET</code> (≥32 tegn)
            </li>
            <li>
              <strong>Durable storage (vælg én):</strong>
              <ul style={{ marginTop: "0.35rem" }}>
                <li>
                  Turso (anbefalet): <code>TURSO_DATABASE_URL</code> /{" "}
                  <code>DATABASE_URL</code> + <code>TURSO_AUTH_TOKEN</code> /{" "}
                  <code>AUTH_TOKEN</code>
                </li>
                <li>
                  Eller Blob: opret Vercel Storage → Blob, kopier{" "}
                  <code>BLOB_READ_WRITE_TOKEN</code> (gemmer hele sql.js-DB + billeder)
                </li>
              </ul>
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
            {!status.hasDurableStorage
              ? " — uden Turso eller Blob forsvinder data mellem requests (opret→detalje giver 404)."
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
