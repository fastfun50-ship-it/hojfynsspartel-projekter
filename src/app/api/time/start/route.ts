import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { getDb, isEphemeralDb } from "@/lib/db";
import { startSession, summarizeSag, overviewForUser } from "@/lib/timeTracking";

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
  const sagId = String(body.sagId || "").trim();
  if (!sagId) {
    return NextResponse.json({ error: "sagId mangler" }, { status: 400 });
  }

  try {
    const db = await getDb();
    const session = await startSession(db, user.id, sagId);
    const summary = await summarizeSag(db, sagId, user.id);
    const overview = await overviewForUser(db, user.id);
    return NextResponse.json({ session, summary, active: overview.active, closedIds: overview.closedIds });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Kunne ikke starte tid";
    const status = msg.includes("afsluttet") ? 409 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
