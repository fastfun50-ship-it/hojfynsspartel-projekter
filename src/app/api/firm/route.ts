import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { hasRole } from "@/lib/constants";
import { getFirm, listPriceLogs } from "@/lib/projects";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });
  if (!hasRole(user.roles, "admin")) {
    return NextResponse.json({ error: "Kun admin" }, { status: 403 });
  }
  const firm = await getFirm();
  const logs = await listPriceLogs();
  return NextResponse.json({ firm, logs });
}
