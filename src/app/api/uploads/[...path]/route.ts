import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(_req: Request, ctx: Ctx) {
  const parts = (await ctx.params).path || [];
  if (parts.some((p) => p.includes("..") || p.includes("/") || p.includes("\\"))) {
    return NextResponse.json({ error: "Ugyldig sti" }, { status: 400 });
  }
  const abs = path.join(process.cwd(), "data", "uploads", ...parts);
  const root = path.join(process.cwd(), "data", "uploads");
  if (!abs.startsWith(root)) {
    return NextResponse.json({ error: "Ugyldig sti" }, { status: 400 });
  }
  if (!fs.existsSync(abs)) {
    return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });
  }
  const buf = fs.readFileSync(abs);
  const ext = path.extname(abs).toLowerCase();
  const type =
    ext === ".png" ? "image/png" :
    ext === ".webp" ? "image/webp" :
    "image/jpeg";
  return new NextResponse(buf, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
