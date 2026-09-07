import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getProject, getProjectImages, withPublicUrls } from "@/lib/projects";
import { isEphemeralDb } from "@/lib/db";
import ProjectDetailClient from "./ProjectDetailClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session.user) redirect("/login");
  const { id } = await params;
  const project = await getProject(id);

  if (!project) {
    const ephemeral = isEphemeralDb();
    return (
      <section className="card stack">
        <h1 style={{ margin: 0, fontSize: "1.25rem" }}>Projekt ikke fundet</h1>
        <p className="hint" style={{ margin: 0 }}>
          Vi kunne ikke finde projektet med id <code>{id}</code>. Det kan være slettet,
          eller du har ikke adgang.
        </p>
        {ephemeral ? (
          <p className="hint" style={{ margin: 0, color: "var(--danger)" }}>
            Bemærk: Databasen er midlertidig på denne Vercel-deployment (ingen Turso og
            ingen BLOB_READ_WRITE_TOKEN). Data forsvinder mellem serverless-isolates —
            sæt <code>DATABASE_URL</code> (Turso) eller <code>BLOB_READ_WRITE_TOKEN</code>{" "}
            og redeploy. Se <Link href="/setup">/setup</Link>.
          </p>
        ) : null}
        <p style={{ margin: 0 }}>
          <Link href="/app" className="btn btn-primary">
            Tilbage til oversigt
          </Link>
        </p>
      </section>
    );
  }

  const images = withPublicUrls(await getProjectImages(id));

  return (
    <ProjectDetailClient
      initialProject={project}
      initialImages={images}
      userId={session.user.id}
    />
  );
}
