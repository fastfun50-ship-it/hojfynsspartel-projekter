import Link from "next/link";
import { notFound } from "next/navigation";
import { getFirm, getProject, getProjectImages, withPublicUrls } from "@/lib/projects";
import { CATEGORY_LABELS, IMAGE_TYPE_LABELS } from "@/lib/constants";
import { adjustPrice, formatKr } from "@/lib/prices";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function PublicProjectDetailPage({ params }: Props) {
  const { id } = await params;
  const [firm, project] = await Promise.all([getFirm(), getProject(id)]);
  if (!project || project.status !== "publiceret" || !project.may_show_public) {
    notFound();
  }
  const images = withPublicUrls(await getProjectImages(id));
  const pct = firm?.global_prisjustering_procent ?? 0;
  const foer = images.filter((i) => i.type === "foer");
  const efter = images.filter((i) => i.type === "efter");

  const from = project.show_price_on_site ? adjustPrice(project.price_from, pct) : null;
  const to = project.show_price_on_site ? adjustPrice(project.price_to, pct) : null;

  return (
    <main className="shell">
      <Link href="/projekter" className="hint">← Alle projekter</Link>
      <h1 className="page-title" style={{ marginTop: "0.75rem" }}>{project.title}</h1>
      <div className="hint">{CATEGORY_LABELS[project.category]}{project.year ? " · " + project.year : ""}</div>

      {project.scope ? (
        <section className="card" style={{ marginTop: "1rem" }}>
          <strong>Omfang</strong>
          <p className="hint" style={{ whiteSpace: "pre-wrap" }}>{project.scope}</p>
        </section>
      ) : null}

      {(from != null || to != null) ? (
        <section className="card" style={{ marginTop: "0.75rem" }}>
          <strong>Pris</strong>
          <p style={{ margin: "0.35rem 0 0", color: "var(--accent)" }}>
            {from != null ? "fra " + formatKr(from) : ""}
            {from != null && to != null ? " – " : ""}
            {to != null && from == null ? formatKr(to) : to != null && from != null ? formatKr(to) : ""}
          </p>
        </section>
      ) : null}

      {[{ type: "foer", list: foer }, { type: "efter", list: efter }].map(({ type, list }) =>
        list.length ? (
          <section key={type} className="card stack" style={{ marginTop: "0.75rem" }}>
            <strong>{IMAGE_TYPE_LABELS[type]}</strong>
            <div className="grid-imgs">
              {list.map((img) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={img.id} src={img.url} alt={IMAGE_TYPE_LABELS[type]} />
              ))}
            </div>
          </section>
        ) : null,
      )}
    </main>
  );
}
