import { NextResponse } from "next/server";
import {
  getFirm,
  listPublicProjects,
  getProject,
  getProjectImages,
  withPublicUrls,
} from "@/lib/projects";
import { adjustPrice, priceFromLabel } from "@/lib/prices";
import type { Project } from "@/lib/types";

export const runtime = "nodejs";

const CACHE = "public, s-maxage=60, stale-while-revalidate=300";

function absoluteUrl(pathOrUrl: string | undefined | null, origin: string): string | null {
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : "/" + pathOrUrl;
  return origin + path;
}

function requestOrigin(req: Request): string {
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    process.env.VERCEL_URL ||
    "hojfynsspartel-projekter.vercel.app";
  if (host.startsWith("http://") || host.startsWith("https://")) {
    return host.replace(/\/$/, "");
  }
  return `${proto}://${host}`;
}

async function toPublicItem(project: Project, pct: number, origin: string) {
  const images = withPublicUrls(await getProjectImages(project.id));
  const before = images.filter((i) => i.type === "foer").at(-1);
  const after = images.filter((i) => i.type === "efter").at(-1);
  const showPrice = !!project.show_price_on_site;
  const adjusted = showPrice ? adjustPrice(project.price_from, pct) : null;
  const label = priceFromLabel(project.price_from, pct, showPrice);
  // Slider uses aligned efter when present (same framing as før)
  const afterForSlider =
    (after as { sliderUrl?: string; alignedUrl?: string | null; url: string } | undefined)
      ?.sliderUrl ||
    (after as { alignedUrl?: string | null } | undefined)?.alignedUrl ||
    after?.url;

  return {
    id: project.id,
    title: project.title,
    category: project.category,
    year: project.year,
    price_from: adjusted,
    priceLabel: label,
    beforeUrl: absoluteUrl(before?.url ?? null, origin),
    afterUrl: absoluteUrl(afterForSlider ?? null, origin),
    afterOriginalUrl: absoluteUrl(after?.url ?? null, origin),
    published_at: project.published_at,
  };
}

export async function GET(req: Request) {
  try {
    const origin = requestOrigin(req);
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const firm = await getFirm();
    const pct = firm?.global_prisjustering_procent ?? 0;

    if (id) {
      const project = await getProject(id);
      if (!project || project.status !== "publiceret" || !project.may_show_public) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const item = await toPublicItem(project, pct, origin);
      return NextResponse.json(item, { headers: { "Cache-Control": CACHE } });
    }

    const projects = await listPublicProjects();
    const items = await Promise.all(projects.map((p) => toPublicItem(p, pct, origin)));
    return NextResponse.json(items, { headers: { "Cache-Control": CACHE } });
  } catch (err) {
    console.error("[api/public/projekter]", err);
    return NextResponse.json([], {
      status: 200,
      headers: { "Cache-Control": "public, s-maxage=10" },
    });
  }
}