import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireUser } from "@/lib/session";
import { getDb } from "@/lib/db";
import { hasRole, IMAGE_TYPES } from "@/lib/constants";
import { getProject, getProjectImages, withPublicUrls } from "@/lib/projects";
import { processAndStoreImage } from "@/lib/storage";
import type { ImageType } from "@/lib/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });
  const { id } = await ctx.params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });
  const images = withPublicUrls(await getProjectImages(id));
  return NextResponse.json({ images });
}

export async function POST(req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });
  if (!hasRole(user.roles, "mester") && !hasRole(user.roles, "admin")) {
    return NextResponse.json({ error: "Ingen adgang" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });

  if (!["kladde", "afventer_godkendelse", "godkendt", "publiceret"].includes(project.status)) {
    return NextResponse.json({ error: "Kan ikke tilføje fotos i denne status" }, { status: 400 });
  }

  const form = await req.formData();
  const type = String(form.get("type") || "") as ImageType;
  const file = form.get("file");

  if (!IMAGE_TYPES.includes(type)) {
    return NextResponse.json({ error: "Ugyldig fototype" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Mangler fil" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length === 0) {
    return NextResponse.json({ error: "Tom fil" }, { status: 400 });
  }

  if (process.env.VERCEL && !process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "BLOB_READ_WRITE_TOKEN mangler i Vercel — kan ikke gemme foto." },
      { status: 503 },
    );
  }

  try {
  const imageId = randomUUID();
  const stored = await processAndStoreImage(id, imageId, buf);
  const now = new Date().toISOString();
  const db = await getDb();
  await db.run(
    "INSERT INTO images (id, project_id, type, path, width, height, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [imageId, id, type, stored.path, stored.width, stored.height, user.id, now],
  );
  await db.run("UPDATE projects SET updated_at = ? WHERE id = ?", [now, id]);

  const images = withPublicUrls(await getProjectImages(id));
  const image = images.find((i) => i.id === imageId);
  return NextResponse.json({ image, images }, { status: 201 });
  } catch (e) {
    console.error(e);
    const detail = String((e as { message?: unknown })?.message ?? e);
    return NextResponse.json({ error: "Upload fejlede", detail }, { status: 500 });
  }
}

