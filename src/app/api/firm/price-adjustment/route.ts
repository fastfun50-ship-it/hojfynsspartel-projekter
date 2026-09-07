import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireUser } from "@/lib/session";
import { getDb } from "@/lib/db";
import { FIRMA_ID, hasRole } from "@/lib/constants";
import { getFirm, listPriceLogs } from "@/lib/projects";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });
  if (!hasRole(user.roles, "admin")) {
    return NextResponse.json({ error: "Kun admin" }, { status: 403 });
  }
  const body = await req.json();
  const pct = Number(body.procent);
  if (Number.isNaN(pct)) {
    return NextResponse.json({ error: "Ugyldig procent" }, { status: 400 });
  }
  const now = new Date().toISOString();
  const db = await getDb();
  await db.run(
    "UPDATE firms SET global_prisjustering_procent = ? WHERE id = ?",
    [pct, FIRMA_ID],
  );
  await db.run(
    "INSERT INTO price_adjustment_logs (id, firma_id, procent, created_at) VALUES (?, ?, ?, ?)",
    [randomUUID(), FIRMA_ID, pct, now],
  );
  return NextResponse.json({ firm: await getFirm(), logs: await listPriceLogs() });
}
