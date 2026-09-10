import { attachCovers, listProjectsForFirm } from "@/lib/projects";
import { STATUS_LABELS, hasRole } from "@/lib/constants";
import { getSession } from "@/lib/session";
import ProjectCard from "@/components/ProjectCard";

export const dynamic = "force-dynamic";

export default async function AppProjectsPage() {
  const session = await getSession();
  const user = session.user;
  const canDelete =
    !!user &&
    (hasRole(user.roles, "admin") || hasRole(user.roles, "mester"));
  const projects = await attachCovers(await listProjectsForFirm());

  return (
    <div className="stack">
      <h1 className="page-title">Projekter</h1>
      {projects.length === 0 ? (
        <p className="hint">Ingen projekter endnu. Opret et og tag før-foto.</p>
      ) : (
        <div className="stack">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              href={"/app/projekter/" + p.id}
              title={p.title}
              coverUrl={p.coverUrl}
              badge={STATUS_LABELS[p.status]}
              deleteId={canDelete ? p.id : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
