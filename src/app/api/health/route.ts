import { NextResponse } from "next/server";
import { dbMode, getDb, countUsers } from "@/lib/db";
import { resolveDatabaseUrl, hasBlobToken } from "@/lib/env";
import { hasSessionSecret } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const hasDbUrl = Boolean(resolveDatabaseUrl());
  const mode = dbMode();
  let userCount = -1;
  let ok = true;
  let detail: string | undefined;

  try {
    const db = await getDb();
    userCount = await countUsers(db);
  } catch (e) {
    ok = false;
    detail = String((e as { message?: unknown })?.message ?? e);
  }

  return NextResponse.json({
    ok,
    dbMode: mode,
    hasSessionSecret: hasSessionSecret(),
    hasDbUrl,
    hasBlobToken: hasBlobToken(),
    userCount,
    ...(detail ? { detail } : {}),
  });
}
