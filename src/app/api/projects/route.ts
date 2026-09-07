import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireUser } from "@/lib/session";
import { getDb, isEphemeralDb } from "@/lib/db";
import { FIRMA_ID, DEFAULT_PROJECT_TITLE, hasRole } from "@/lib/constants";
import { listProjectsForFirm } from "@/lib/projects";
import type { Category } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status") || undefined;
  const projects = await listProjectsForFirm(status ? { status } : undefined);
  return NextResponse.json({ projects });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });
  if (!hasRole(user.roles, "mester") && !hasRole(user.roles, "admin")) {
    return NextResponse.json({ error: "Ingen adgang" }, { status: 403 });
  }

  if (isEphemeralDb()) {
    return NextResponse.json(
      {
        error:
          "Sæt DATABASE_URL (Turso) eller BLOB_READ_WRITE_TOKEN i Vercel — ellers forsvinder data mellem requests.",
      },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || DEFAULT_PROJECT_TITLE).trim() || DEFAULT_PROJECT_TITLE;
  const category = (String(body.category || "facade") as Category);
  const note = body.note ? String(body.note) : null;
  const now = new Date().toISOString();
  const id = randomUUID();

  const db = await getDb();
  await db.run(
    `INSERT INTO projects (
      id, firma_id, title, category, note, status,
      price_from, price_to, scope, year,
      may_show_public, show_price_on_site, reject_note,
      created_by, created_at, updated_at, published_at
    ) VALUES (?, ?, ?, ?, ?, 'kladde', NULL, NULL, NULL, ?, 0, 0, NULL, ?, ?, ?, NULL)`,
    [id, FIRMA_ID, title, category, note, new Date().getFullYear(), user.id, now, now],
  );

  const project = await db.get("SELECT * FROM projects WHERE id = ?", [id]);
  return NextResponse.json({ project }, { status: 201 });
}
