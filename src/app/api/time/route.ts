import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { getDb } from "@/lib/db";
import { overviewForUser, summarizeSag } from "@/lib/timeTracking";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });

  const db = await getDb();
  const url = new URL(req.url);
  const sagId = url.searchParams.get("sagId");

  if (sagId) {
    const summary = await summarizeSag(db, sagId, user.id);
    const overview = await overviewForUser(db, user.id);
    return NextResponse.json({
      summary,
      active: overview.active,
      closedIds: overview.closedIds,
    });
  }

  const overview = await overviewForUser(db, user.id);
  return NextResponse.json(overview);
}
