# Højfynsspartel Projekter (PWA)

Separat Phase 1-app til mester-fotos (før/under/efter) + admin-godkendelse + offentlig /projekter.

Ikke marketing-sitet. firma_id/brand/test-data er Højfynsspartel; deploy = egen GitHub-repo + Vercel-URL (ingen domain-cutover i phase 1).

Mappe: /workspace/hfs-foto-pwa · GitHub: https://github.com/fastfun50-ship-it/hojfynsspartel-projekter

## Stack
- Next.js 15 App Router + TypeScript
- DB: Turso/libsql på Vercel; lokalt sql.js → data/app.db (better-sqlite3 undladt)
- Billeder: data/uploads/{projectId}/ lokalt; valgfrit Vercel Blob
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
- src/lib/publishProject.ts — eneste publiceringssti + TODO WordPress-connector

## Env (.env.example)
SESSION_SECRET, TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, BLOB_READ_WRITE_TOKEN

## GitHub → Vercel (demo)
1. Opret repo hojfynsspartel-projekter (ikke marketing-repo)
2. Push kode → Vercel Add Project
3. Sæt env (SESSION_SECRET + Turso + evt. Blob)
4. Deploy; kør seed med Turso-env
5. Demo = Vercel-URL only

### Senere cutover (docs only)
Reverse proxy / rewrite af firmadomænets /projekter til denne Vercel-app. Marketing urørt.

## Antagelser
- firma_id = hojfynsspartel
- Pris: Math.round(grundpris * (1 + pct/100) / 1000) * 1000
- Aldrig auto-publish ved upload
