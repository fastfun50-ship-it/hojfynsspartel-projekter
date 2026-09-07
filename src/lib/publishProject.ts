import { getDb } from "./db";
import type { Project } from "./types";

/**
 * publishProject — the ONLY path that makes a project public on /projekter.
 *
 * TODO(WordPress connector): After status is set to publiceret, sync project
 * metadata + image URLs to the marketing site (e.g. højfynsspartel.dk/projekter
 * via reverse proxy / rewrite, or a WP REST push). Hook goes here — do not
 * auto-publish from photo upload or approval alone.
 */
export async function publishProject(projectId: string): Promise<Project> {
  const db = await getDb();
  const existing = await db.get<Project>("SELECT * FROM projects WHERE id = ?", [projectId]);
  if (!existing) {
    throw new Error("Projekt findes ikke");
  }

  const now = new Date().toISOString();
  await db.run(
    `UPDATE projects
     SET status = 'publiceret',
         may_show_public = 1,
         published_at = ?,
         updated_at = ?,
         reject_note = NULL
     WHERE id = ?`,
    [now, now, projectId],
  );

  // TODO(WordPress connector): await syncProjectToWordPress(projectId);

  const updated = await db.get<Project>("SELECT * FROM projects WHERE id = ?", [projectId]);
  if (!updated) throw new Error("Projekt mangler efter publicering");
  return updated;
}
