import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { getDb } from "@/lib/db";
import { summarizeSag, overviewForUser } from "@/lib/timeTracking";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ sagId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  const { sagId } = await ctx.params;
  const db = await getDb();
  const summary = await summarizeSag(db, decodeURIComponent(sagId), user.id);
  const overview = await overviewForUser(db, user.id);
  return NextResponse.json({
    summary,
    active: overview.active,
    closedIds: overview.closedIds,
  });
}
