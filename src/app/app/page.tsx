import { attachCovers, listProjectsForFirm } from "@/lib/projects";
import { STATUS_LABELS, hasRole } from "@/lib/constants";
import { getSession } from "@/lib/session";
import ProjectCard from "@/components/ProjectCard";
import DeleteProjectButton from "@/components/DeleteProjectButton";

export const dynamic = "force-dynamic";

export default async function AppHomePage() {
  const session = await getSession();
  const user = session.user;
  const isAdmin = user ? hasRole(user.roles, "admin") : false;
  const projects = await attachCovers(await listProjectsForFirm());

  return (
    <div className="stack">
      <h1 className="page-title">Projekter</h1>
      {projects.length === 0 ? (
        <p className="hint">Ingen projekter endnu. Opret et og tag før-foto.</p>
      ) : (
        <div className="stack">
          {projects.map((p) => {
            const canDelete =
              !!user &&
              (isAdmin || (p.created_by === user.id && p.status === "kladde"));
            return (
              <ProjectCard
                key={p.id}
                href={"/app/projekter/" + p.id}
                title={p.title}
                coverUrl={p.coverUrl}
                badge={STATUS_LABELS[p.status]}
                footer={canDelete ? <DeleteProjectButton projectId={p.id} /> : null}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
