import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { getDb } from "@/lib/db";
import { getProject } from "@/lib/projects";
import { deleteStoredImage } from "@/lib/storage";
import type { ProjectImage } from "@/lib/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string; imageId: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  const { id, imageId } = await ctx.params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });

  if (!["kladde", "afventer_godkendelse"].includes(project.status)) {
    return NextResponse.json({ error: "Kan kun slette fotos i kladde/afventer" }, { status: 400 });
  }

  const db = await getDb();
  const image = await db.get<ProjectImage>(
    "SELECT * FROM images WHERE id = ? AND project_id = ?",
    [imageId, id],
  );
  if (!image) return NextResponse.json({ error: "Billede ikke fundet" }, { status: 404 });

  if (image.created_by !== user.id && !(user.roles.includes("admin") || user.roles.includes("both"))) {
    return NextResponse.json({ error: "Kan kun slette egne billeder" }, { status: 403 });
  }

  await deleteStoredImage(image.path);
  await db.run("DELETE FROM images WHERE id = ?", [imageId]);
  await db.run("UPDATE projects SET updated_at = ? WHERE id = ?", [new Date().toISOString(), id]);

  return NextResponse.json({ ok: true });
}
