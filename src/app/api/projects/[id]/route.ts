import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { getDb } from "@/lib/db";
import { hasRole } from "@/lib/constants";
import { getProject, getProjectImages, withPublicUrls } from "@/lib/projects";
import { deleteStoredImage } from "@/lib/storage";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });
  const { id } = await ctx.params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });
  const images = withPublicUrls(await getProjectImages(id));
  return NextResponse.json({ project, images });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });
  if (!hasRole(user.roles, "admin")) {
    return NextResponse.json({ error: "Kun admin" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });

  const body = await req.json();
  const title = body.title != null ? String(body.title) : project.title;
  const category = body.category != null ? String(body.category) : project.category;
  const scope = body.scope != null ? String(body.scope) : project.scope;
  const note = body.note != null ? String(body.note) : project.note;
  const year = body.year != null ? Number(body.year) : project.year;
  const price_from = body.price_from != null && body.price_from !== "" ? Number(body.price_from) : project.price_from;
  const price_to = body.price_to != null && body.price_to !== "" ? Number(body.price_to) : project.price_to;
  const may_show_public = body.may_show_public != null ? (body.may_show_public ? 1 : 0) : project.may_show_public;
  const show_price_on_site = body.show_price_on_site != null ? (body.show_price_on_site ? 1 : 0) : project.show_price_on_site;
  const now = new Date().toISOString();

  const db = await getDb();
  await db.run(
    `UPDATE projects SET title=?, category=?, scope=?, note=?, year=?,
      price_from=?, price_to=?, may_show_public=?, show_price_on_site=?, updated_at=?
     WHERE id=?`,
    [title, category, scope, note, year, price_from, price_to, may_show_public, show_price_on_site, now, id],
  );

  const updated = await getProject(id);
  return NextResponse.json({ project: updated });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  const { id } = await ctx.params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });

  const isAdmin = hasRole(user.roles, "admin");
  const isMester = hasRole(user.roles, "mester");
  if (!isAdmin && !isMester) {
    return NextResponse.json({ error: "Ingen adgang" }, { status: 403 });
  }

  const images = await getProjectImages(id);
  for (const img of images) {
    await deleteStoredImage(img.path);
  }

  const db = await getDb();
  await db.run("DELETE FROM images WHERE project_id = ?", [id]);
  await db.run("DELETE FROM projects WHERE id = ?", [id]);

  return NextResponse.json({ ok: true });
}
