import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { getDb, isEphemeralDb } from "@/lib/db";
import { reopenSag, overviewForUser } from "@/lib/timeTracking";

export const runtime = "nodejs";

/** Re-open a closed sag so Start tid works again (e.g. closed by mistake). */
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
  const sagId = String(body.sagId || "").trim();
  if (!sagId) {
    return NextResponse.json({ error: "sagId mangler" }, { status: 400 });
  }

  try {
    const db = await getDb();
    const summary = await reopenSag(db, user.id, sagId);
    const overview = await overviewForUser(db, user.id);
    return NextResponse.json({
      summary,
      active: overview.active,
      closedIds: overview.closedIds,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Kunne ikke genåbne sag";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
