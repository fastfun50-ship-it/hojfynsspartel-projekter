import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { getDb, isEphemeralDb } from "@/lib/db";
import { updateSessionTimes, summarizeSag } from "@/lib/timeTracking";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  if (isEphemeralDb()) {
    return NextResponse.json(
      {
        error:
          "Sæt DATABASE_URL (Turso) eller BLOB_READ_WRITE_TOKEN i Vercel — ellers forsvinder tid mellem requests.",
      },
      { status: 503 },
    );
  }

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const patch: { started_at?: string; ended_at?: string | null } = {};
  if (typeof body.started_at === "string") patch.started_at = body.started_at;
  if (body.ended_at === null) patch.ended_at = null;
  else if (typeof body.ended_at === "string") patch.ended_at = body.ended_at;

  try {
    const db = await getDb();
    const session = await updateSessionTimes(db, id, user.id, patch);
    const summary = await summarizeSag(db, session.sag_id, user.id);
    return NextResponse.json({ session, summary });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Kunne ikke rette tid";
    const status = msg.includes("adgang") || msg.includes("findes") ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
