import Link from "next/link";
import {
  getFirm,
  listPublicProjects,
  getProjectImages,
  pickCover,
  withPublicUrls,
} from "@/lib/projects";
import { CATEGORY_LABELS } from "@/lib/constants";
import { priceFromLabel } from "@/lib/prices";
import { publicImageUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function PublicProjectsPage() {
  const [firm, projects] = await Promise.all([getFirm(), listPublicProjects()]);
  const pct = firm?.global_prisjustering_procent ?? 0;

  const cards = await Promise.all(
    projects.map(async (p) => {
      const images = withPublicUrls(await getProjectImages(p.id));
      const cover = pickCover(images);
      return { p, coverUrl: cover ? publicImageUrl(cover.path) : null };
    }),
  );

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <div style={{ color: "var(--accent)", fontWeight: 800 }}>Højfynsspartel</div>
          <h1 style={{ margin: "0.25rem 0 0", fontSize: "1.4rem" }}>Projekter</h1>
        </div>
        <Link href="/login" className="hint">Log ind</Link>
      </header>

      {cards.length === 0 ? (
        <p className="hint">Ingen publicerede projekter endnu.</p>
      ) : (
        <div className="stack">
          {cards.map(({ p, coverUrl }) => {
            const price = priceFromLabel(p.price_from, pct, !!p.show_price_on_site);
            return (
              <Link
                key={p.id}
                href={"/projekter/" + p.id}
                className="card"
                style={{ display: "block", textDecoration: "none", color: "inherit" }}
              >
                {coverUrl ? (
                  <div className="cover" style={{ marginBottom: "0.75rem" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={coverUrl} alt={p.title} />
                  </div>
                ) : null}
                <strong>{p.title}</strong>
                <div className="hint">{CATEGORY_LABELS[p.category] || p.category}</div>
                {price ? <div style={{ marginTop: "0.35rem", color: "var(--accent)" }}>{price}</div> : null}
              </Link>
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
