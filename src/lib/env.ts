export type EnvStatus = {
  ok: boolean;
  missing: string[];
  onVercel: boolean;
  hasTurso: boolean;
  hasBlobToken: boolean;
  hasDurableStorage: boolean;
  hasSessionSecret: boolean;
};

/** Preferred names; aliases DATABASE_URL / AUTH_TOKEN also accepted. */
export const REQUIRED_ENV_KEYS = [
  "SESSION_SECRET",
  "TURSO_DATABASE_URL",
  "TURSO_AUTH_TOKEN",
] as const;

/** Blob can substitute Turso for durable sql.js on Vercel. */
export const OPTIONAL_ENV_KEYS = ["BLOB_READ_WRITE_TOKEN"] as const;

/** Prefer TURSO_DATABASE_URL; fall back to DATABASE_URL. */
export function resolveDatabaseUrl(): string {
  return (
    process.env.TURSO_DATABASE_URL ||
    process.env.DATABASE_URL ||
    ""
  ).trim();
}

/** Prefer TURSO_AUTH_TOKEN; fall back to AUTH_TOKEN. */
export function resolveAuthToken(): string {
  return (
    process.env.TURSO_AUTH_TOKEN ||
    process.env.AUTH_TOKEN ||
    ""
  ).trim();
}

export function isLibsqlUrl(url: string): boolean {
  return url.startsWith("libsql://") || url.startsWith("https://");
}

export function hasBlobToken(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

/** Turso preferred; Vercel Blob backs sql.js for durable demo without Turso. */
export function hasDurableStorage(): boolean {
  const dbUrl = resolveDatabaseUrl();
  const authToken = resolveAuthToken();
  const hasTurso = isLibsqlUrl(dbUrl) && Boolean(authToken);
  return hasTurso || hasBlobToken();
}

export function getEnvStatus(): EnvStatus {
  const onVercel = Boolean(process.env.VERCEL);
  const sessionSecret = process.env.SESSION_SECRET || "";
  const hasSessionSecret = sessionSecret.length >= 32;
  const dbUrl = resolveDatabaseUrl();
  const authToken = resolveAuthToken();
  const hasTurso = isLibsqlUrl(dbUrl) && Boolean(authToken);
  const blob = hasBlobToken();
  const durable = hasTurso || blob;

  const missing: string[] = [];
  if (!hasSessionSecret) missing.push("SESSION_SECRET");
  // On Vercel, durable storage (Turso OR Blob) is required for create→detail.
  if (onVercel && !durable) {
    missing.push("TURSO_DATABASE_URL / DATABASE_URL + token — eller BLOB_READ_WRITE_TOKEN");
  }

  // Production-safe minimum: SESSION_SECRET so pages/login do not crash.
  // Missing durable storage → ephemeral sql.js; still "ok" enough to render.
  const ok = hasSessionSecret;

  return {
    ok,
    missing,
    onVercel,
    hasTurso,
    hasBlobToken: blob,
    hasDurableStorage: durable,
    hasSessionSecret,
  };
}
