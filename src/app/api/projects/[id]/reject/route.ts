import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { getDb } from "@/lib/db";
import { hasRole } from "@/lib/constants";
import { getProject } from "@/lib/projects";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });
  if (!hasRole(user.roles, "admin")) {
    return NextResponse.json({ error: "Kun admin" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });
  if (project.status !== "afventer_godkendelse") {
    return NextResponse.json({ error: "Ikke i godkendelseskø" }, { status: 400 });
  }
  const body = await req.json().catch(() => ({}));
  const note = String(body.note || "").trim() || null;
  const now = new Date().toISOString();
  const db = await getDb();
  await db.run(
    "UPDATE projects SET status = ?, reject_note = ?, updated_at = ? WHERE id = ?",
    ["kladde", note, now, id],
  );
  return NextResponse.json({ project: await getProject(id) });
}
