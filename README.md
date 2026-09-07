# Højfynsspartel Projekter (PWA)

Separat Phase 1-app til mester-fotos (før/under/efter) + admin-godkendelse + offentlig /projekter.

Ikke marketing-sitet. firma_id/brand/test-data er Højfynsspartel; deploy = egen GitHub-repo + Vercel-URL (ingen domain-cutover i phase 1).

Mappe: /workspace/hfs-foto-pwa · GitHub: https://github.com/fastfun50-ship-it/hojfynsspartel-projekter

## Stack
- Next.js 15 App Router + TypeScript
- DB: Turso/libsql på Vercel (TURSO_* eller DATABASE_URL + AUTH_TOKEN); lokalt sql.js → data/app.db
- Vercel uden Turso: sæt `BLOB_READ_WRITE_TOKEN` — hele sql.js-DB gemmes i ét Vercel Blob-objekt (`hfs-app-db.bin`) efter hver mutation
- Vercel uden Turso **og** uden Blob: midlertidig sql.js pr. isolate (opret→detalje fejler; POST /api/projects → 503)
- Billeder: data/uploads/{projectId}/ lokalt; Vercel Blob når token er sat
- sharp, iron-session, bcryptjs
- PWA: public/manifest.webmanifest + public/sw.js

## Kør lokalt
cp .env.example .env.local
bun install   # eller npm install
bun run seed
bun run dev   # http://localhost:3001
bun run build # verificeret OK

## Testbrugere
- mester@hojfynsspartel.dk / mester123 (mester)
- admin@hojfynsspartel.dk / admin123 (admin)
- peter@hojfynsspartel.dk / peter123 (mester+admin)

## PWA iPhone
Safari → Del → Føj til hjemmeskærm. start_url=/app. HTTPS (localhost OK på enhed).

## Layout
- src/app/api/ — API
- src/app/app/ — mester + admin
- src/app/projekter/ — offentlig
- src/app/setup/ — Vercel env-checklist (ingen secrets)
- src/lib/publishProject.ts — eneste publiceringssti + TODO WordPress-connector

## Env (.env.example)
Påkrævet på Vercel (Production + Preview):
- `SESSION_SECRET` — min. 32 tegn (login/cookies)
- **Durable storage (vælg mindst én)** — `SESSION_SECRET` alene er **ikke** nok til create→detail:
  - Turso (anbefalet): `TURSO_DATABASE_URL` **eller** `DATABASE_URL` + `TURSO_AUTH_TOKEN` **eller** `AUTH_TOKEN`
  - **eller** Vercel Blob: `BLOB_READ_WRITE_TOKEN` (Storage → Blob) — deler sql.js-DB på tværs af isolates

Koden accepterer begge Turso-navne (se `src/lib/env.ts`). Mangler `SESSION_SECRET` → `/` redirecter til `/setup`.

### Vercel crash-check
1. `/` 500 → mangler/for kort `SESSION_SECRET`
2. Opret projekt → 404 på detalje / POST 503 → mangler Turso **og** Blob (ephemeral sql.js)
3. Redeploy efter env-ændring
4. Kør seed med samme Turso-env (hvis Turso)

## GitHub → Vercel (demo) — eksakte klik
1. Opret repo hojfynsspartel-projekter (ikke marketing-repo)
2. Push kode → Vercel **Add New… → Project** → vælg repo → Deploy
3. Åbn projektet i [Vercel Dashboard](https://vercel.com/dashboard)
4. Klik **Settings** → **Environment Variables**
5. Tilføj (Production + Preview):
   - `SESSION_SECRET` (≥32 tilfældige tegn)
   - **Enten** Turso: `TURSO_DATABASE_URL` / `DATABASE_URL` + `TURSO_AUTH_TOKEN` / `AUTH_TOKEN`
   - **Eller** Blob: Storage → Blob → kopier `BLOB_READ_WRITE_TOKEN`
6. Gem → **Deployments** → … på seneste → **Redeploy**
7. (Valgfrit) seed med samme DB-env: `TURSO_*=… bun run seed`
8. Hvis env mangler: åbn `/setup`. Demo = Vercel-URL only

### Senere cutover (docs only)
Reverse proxy / rewrite af firmadomænets /projekter til denne Vercel-app. Marketing urørt.

## Antagelser
- firma_id = hojfynsspartel
- Pris: Math.round(grundpris * (1 + pct/100) / 1000) * 1000
- Aldrig auto-publish ved upload
