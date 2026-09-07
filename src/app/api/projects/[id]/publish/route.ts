import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { hasRole } from "@/lib/constants";
import { getProject } from "@/lib/projects";
import { publishProject } from "@/lib/publishProject";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Ikke logget ind" }, { status: 401 });
  if (!hasRole(user.roles, "admin")) {
    return NextResponse.json({ error: "Kun admin" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const project = await getProject(id);
  if (!project) return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });
  if (!["godkendt", "skjult"].includes(project.status)) {
    return NextResponse.json(
      { error: "Kan kun publicere godkendte eller skjulte projekter" },
      { status: 400 },
    );
  }
  try {
    const published = await publishProject(id);
    return NextResponse.json({ project: published });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Publicering fejlede" }, { status: 500 });
  }
}
