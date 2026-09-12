import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { getDb } from "@/lib/db";
import { hasRole } from "@/lib/constants";
import { getProject, getRoom, listRoomsForProject } from "@/lib/projects";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string; roomId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });
  if (!hasRole(user.roles, "mester") && !hasRole(user.roles, "admin")) {
    return NextResponse.json({ error: "Ingen adgang" }, { status: 403 });
  }

  const { id, roomId } = await ctx.params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });
  const existing = await getRoom(roomId);
  if (!existing || existing.project_id !== id) {
    return NextResponse.json({ error: "Rum ikke fundet" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const name = body.name != null ? String(body.name).trim() || existing.name : existing.name;
  const length_m =
    body.length_m !== undefined
      ? body.length_m === null || body.length_m === ""
        ? null
        : Number(body.length_m)
      : existing.length_m;
  const width_m =
    body.width_m !== undefined
      ? body.width_m === null || body.width_m === ""
        ? null
        : Number(body.width_m)
      : existing.width_m;
  const height_m =
    body.height_m !== undefined
      ? body.height_m === null || body.height_m === ""
        ? null
        : Number(body.height_m)
      : existing.height_m;
  const sort_order =
    body.sort_order != null ? Number(body.sort_order) : existing.sort_order;
  const now = new Date().toISOString();

  const db = await getDb();
  await db.run(
    `UPDATE rooms SET name=?, length_m=?, width_m=?, height_m=?, sort_order=?, updated_at=?
     WHERE id=? AND project_id=?`,
    [name, length_m, width_m, height_m, sort_order, now, roomId, id],
  );
  await db.run("UPDATE projects SET updated_at = ? WHERE id = ?", [now, id]);

  const rooms = await listRoomsForProject(id);
  const room = rooms.find((r) => r.id === roomId);
  return NextResponse.json({ room, rooms });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });
  if (!hasRole(user.roles, "mester") && !hasRole(user.roles, "admin")) {
    return NextResponse.json({ error: "Ingen adgang" }, { status: 403 });
  }

  const { id, roomId } = await ctx.params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });
  const existing = await getRoom(roomId);
  if (!existing || existing.project_id !== id) {
    return NextResponse.json({ error: "Rum ikke fundet" }, { status: 404 });
  }

  const db = await getDb();
  await db.run("UPDATE images SET room_id = NULL WHERE room_id = ?", [roomId]);
  await db.run("DELETE FROM rooms WHERE id = ? AND project_id = ?", [roomId, id]);
  await db.run("UPDATE projects SET updated_at = ? WHERE id = ?", [
    new Date().toISOString(),
    id,
  ]);

  const rooms = await listRoomsForProject(id);
  return NextResponse.json({ ok: true, rooms });
}
