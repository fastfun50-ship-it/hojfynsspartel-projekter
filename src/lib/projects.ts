import { getDb } from "./db";
import { FIRMA_ID } from "./constants";
import type { Project, ProjectImage, Firm, PriceAdjustmentLog } from "./types";
import { publicImageUrl } from "./storage";

export async function getFirm(): Promise<Firm | undefined> {
  const db = await getDb();
  return db.get<Firm>("SELECT * FROM firms WHERE id = ?", [FIRMA_ID]);
}

export async function listPriceLogs(): Promise<PriceAdjustmentLog[]> {
  const db = await getDb();
  return db.all<PriceAdjustmentLog>(
    "SELECT * FROM price_adjustment_logs WHERE firma_id = ? ORDER BY created_at DESC LIMIT 50",
    [FIRMA_ID],
  );
}

export async function listProjectsForFirm(opts?: {
  status?: string;
}): Promise<Project[]> {
  const db = await getDb();
  if (opts?.status) {
    return db.all<Project>(
      "SELECT * FROM projects WHERE firma_id = ? AND status = ? ORDER BY updated_at DESC",
      [FIRMA_ID, opts.status],
    );
  }
  return db.all<Project>(
    "SELECT * FROM projects WHERE firma_id = ? ORDER BY updated_at DESC",
    [FIRMA_ID],
  );
}

export async function listPublicProjects(): Promise<Project[]> {
  const db = await getDb();
  return db.all<Project>(
    `SELECT * FROM projects
     WHERE firma_id = ?
       AND status = 'publiceret'
       AND may_show_public = 1
     ORDER BY published_at DESC`,
    [FIRMA_ID],
  );
}

export async function getProject(id: string): Promise<Project | undefined> {
  const db = await getDb();
  return db.get<Project>("SELECT * FROM projects WHERE id = ? AND firma_id = ?", [
    id,
    FIRMA_ID,
  ]);
}

export async function getProjectImages(projectId: string): Promise<ProjectImage[]> {
  const db = await getDb();
  return db.all<ProjectImage>(
    "SELECT * FROM images WHERE project_id = ? ORDER BY created_at ASC",
    [projectId],
  );
}

export function withPublicUrls(images: ProjectImage[]) {
  return images.map((img) => ({
    ...img,
    url: publicImageUrl(img.path),
  }));
}

export function pickCover(images: ProjectImage[]): ProjectImage | undefined {
  return (
    images.filter((i) => i.type === "efter").at(-1) ||
    images.filter((i) => i.type === "foer").at(-1) ||
    images[0]
  );
}

export type ProjectWithCover = Project & { coverUrl: string | null };

export async function attachCovers(projects: Project[]): Promise<ProjectWithCover[]> {
  return Promise.all(
    projects.map(async (p) => {
      const images = await getProjectImages(p.id);
      const cover = pickCover(images);
      return { ...p, coverUrl: cover ? publicImageUrl(cover.path) : null };
    }),
  );
}
