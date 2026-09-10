import { attachCovers, listProjectsForFirm } from "@/lib/projects";
import { STATUS_LABELS } from "@/lib/constants";
import ProjectCard from "@/components/ProjectCard";

export const dynamic = "force-dynamic";

export default async function AppHomePage() {
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
              deleteId={p.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
