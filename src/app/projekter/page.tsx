import Link from "next/link";
import {
  getFirm,
  listPublicProjects,
  attachCovers,
} from "@/lib/projects";
import { CATEGORY_LABELS } from "@/lib/constants";
import { priceFromLabel } from "@/lib/prices";
import ProjectCard from "@/components/ProjectCard";

export const dynamic = "force-dynamic";

export default async function PublicProjectsPage() {
  let firm: Awaited<ReturnType<typeof getFirm>> | undefined;
  let projects: Awaited<ReturnType<typeof listPublicProjects>> = [];

  try {
    [firm, projects] = await Promise.all([getFirm(), listPublicProjects()]);
  } catch (err) {
    console.error("[projekter] DB unavailable, showing empty state", err);
    firm = undefined;
    projects = [];
  }

  const pct = firm?.global_prisjustering_procent ?? 0;

  let cards: Awaited<ReturnType<typeof attachCovers>> = [];
  try {
    cards = await attachCovers(projects);
  } catch (err) {
    console.error("[projekter] image load failed", err);
    cards = projects.map((p) => ({ ...p, coverUrl: null }));
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <div className="brand">Højfynsspartel</div>
          <h1 className="page-title">Projekter</h1>
        </div>
        <Link href="/login" className="hint">Log ind</Link>
      </header>

      {cards.length === 0 ? (
        <p className="hint">Ingen publicerede projekter endnu.</p>
      ) : (
        <div className="stack">
          {cards.map((p) => {
            const price = priceFromLabel(p.price_from, pct, !!p.show_price_on_site);
            const cat = CATEGORY_LABELS[p.category] || p.category;
            return (
              <ProjectCard
                key={p.id}
                href={"/projekter/" + p.id}
                title={p.title}
                coverUrl={p.coverUrl}
                subtitle={price ? cat + " · " + price : cat}
              />
            );
          })}
        </div>
      )}

      <p className="hint" style={{ marginTop: "1.5rem" }}>
        <Link href="/privatliv">Privatliv</Link>
      </p>
    </main>
  );
}
