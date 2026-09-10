import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { getDb } from "@/lib/db";
import { hasRole } from "@/lib/constants";
import { getProject } from "@/lib/projects";
import { publishProject } from "@/lib/publishProject";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

const KINDS = new Set(["submit", "publish", "hide", "reject"]);

export async function POST(req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  const { id } = await ctx.params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const kind = String(body.kind || "");
  if (!KINDS.has(kind)) {
    return NextResponse.json({ error: "Ukendt handling" }, { status: 400 });
  }

  const isAdmin = hasRole(user.roles, "admin");
  const isMester = hasRole(user.roles, "mester");
  const now = new Date().toISOString();
  const db = await getDb();

  if (kind === "submit") {
    if (!isMester && !isAdmin) {
      return NextResponse.json({ error: "Ingen adgang" }, { status: 403 });
    }
    if (project.status !== "afventer_godkendelse") {
      return NextResponse.json({ error: "Kan ikke fortryde" }, { status: 400 });
    }
    await db.run(
      "UPDATE projects SET status = ?, updated_at = ? WHERE id = ?",
      ["kladde", now, id],
    );
  } else if (kind === "publish") {
    if (!isAdmin) return NextResponse.json({ error: "Kun admin" }, { status: 403 });
    if (project.status !== "publiceret") {
      return NextResponse.json({ error: "Kan ikke fortryde" }, { status: 400 });
    }
    await db.run(
      "UPDATE projects SET status = ?, may_show_public = 0, updated_at = ? WHERE id = ?",
      ["skjult", now, id],
    );
  } else if (kind === "hide") {
    if (!isAdmin) return NextResponse.json({ error: "Kun admin" }, { status: 403 });
    if (project.status !== "skjult") {
      return NextResponse.json({ error: "Kan ikke fortryde" }, { status: 400 });
    }
    await publishProject(id);
  } else if (kind === "reject") {
    if (!isAdmin) return NextResponse.json({ error: "Kun admin" }, { status: 403 });
    if (project.status !== "kladde") {
      return NextResponse.json({ error: "Kan ikke fortryde" }, { status: 400 });
    }
    await db.run(
      "UPDATE projects SET status = ?, reject_note = NULL, updated_at = ? WHERE id = ?",
      ["afventer_godkendelse", now, id],
    );
  }

  return NextResponse.json({ project: await getProject(id) });
}
