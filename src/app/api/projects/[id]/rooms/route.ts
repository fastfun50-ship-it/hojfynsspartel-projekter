import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireUser } from "@/lib/session";
import { getDb } from "@/lib/db";
import { hasRole } from "@/lib/constants";
import { getProject, listRoomsForProject } from "@/lib/projects";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });
  const { id } = await ctx.params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });
  const rooms = await listRoomsForProject(id);
  return NextResponse.json({ rooms });
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

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "Rum").trim() || "Rum";
  const length_m = body.length_m != null && body.length_m !== "" ? Number(body.length_m) : null;
  const width_m = body.width_m != null && body.width_m !== "" ? Number(body.width_m) : null;
  const height_m = body.height_m != null && body.height_m !== "" ? Number(body.height_m) : null;

  const db = await getDb();
  const existing = await listRoomsForProject(id);
  const sort_order =
    body.sort_order != null ? Number(body.sort_order) : existing.length;
  const now = new Date().toISOString();
  const roomId = randomUUID();

  await db.run(
    `INSERT INTO rooms (id, project_id, name, length_m, width_m, height_m, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [roomId, id, name, length_m, width_m, height_m, sort_order, now, now],
  );
  await db.run("UPDATE projects SET updated_at = ? WHERE id = ?", [now, id]);

  const rooms = await listRoomsForProject(id);
  const room = rooms.find((r) => r.id === roomId);
  return NextResponse.json({ room, rooms }, { status: 201 });
}
