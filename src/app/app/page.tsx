import Link from "next/link";
import { listProjectsForFirm } from "@/lib/projects";
import { CATEGORY_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AppHomePage() {
  const projects = await listProjectsForFirm();

  return (
    <div className="stack">
      <div className="topbar" style={{ marginBottom: 0 }}>
        <h1 style={{ margin: 0, fontSize: "1.35rem" }}>Mine projekter</h1>
      </div>
      <Link href="/app/projekter/ny" className="btn btn-primary">
        + Nyt projekt
      </Link>
      {projects.length === 0 ? (
        <p className="hint">Ingen projekter endnu. Opret et og tag før-foto.</p>
      ) : (
        <div className="stack">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={"/app/projekter/" + p.id}
              className="card"
              style={{ display: "block" }}
            >
              <strong>{p.title}</strong>
              <div className="hint" style={{ marginTop: "0.35rem" }}>
                {CATEGORY_LABELS[p.category] || p.category}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
