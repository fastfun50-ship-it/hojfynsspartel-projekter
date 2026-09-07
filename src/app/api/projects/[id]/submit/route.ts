import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { getDb } from "@/lib/db";
import { hasRole } from "@/lib/constants";
import { getProject } from "@/lib/projects";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

/** Allowed: kladde (first send) and publiceret (re-submit after new foer/efter). Approve-gate unchanged; admin still approves/publishes. */
const SUBMITTABLE = new Set(["kladde", "publiceret"]);

export async function POST(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });
  if (!hasRole(user.roles, "mester") && !hasRole(user.roles, "admin")) {
    return NextResponse.json({ error: "Ingen adgang" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });
  if (!SUBMITTABLE.has(project.status)) {
    return NextResponse.json(
      { error: "Kan ikke sendes til godkendelse i denne status" },
      { status: 400 },
    );
  }
  const now = new Date().toISOString();
  const db = await getDb();
  await db.run(
    "UPDATE projects SET status = ?, reject_note = NULL, updated_at = ? WHERE id = ?",
    ["afventer_godkendelse", now, id],
  );
  return NextResponse.json({ project: await getProject(id) });
}
