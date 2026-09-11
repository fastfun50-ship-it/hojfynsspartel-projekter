import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { getDb, isEphemeralDb } from "@/lib/db";
import { stopSessionForSag, summarizeSag, overviewForUser } from "@/lib/timeTracking";

export const runtime = "nodejs";

export async function POST(req: Request) {
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

  const body = await req.json().catch(() => ({}));
  const sagId = body.sagId ? String(body.sagId).trim() : undefined;

  try {
    const db = await getDb();
    const session = await stopSessionForSag(db, user.id, sagId);
    const targetSag = sagId || session?.sag_id;
    const summary = targetSag
      ? await summarizeSag(db, targetSag, user.id)
      : null;
    const overview = await overviewForUser(db, user.id);
    return NextResponse.json({
      session,
      summary,
      active: overview.active,
      closedIds: overview.closedIds,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Kunne ikke stoppe tid";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
