import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getProject, getProjectImages, withPublicUrls } from "@/lib/projects";
import ProjectDetailClient from "./ProjectDetailClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session.user) redirect("/login");
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();
  const images = withPublicUrls(await getProjectImages(id));

  return (
    <ProjectDetailClient
      initialProject={project}
      initialImages={images}
      userId={session.user.id}
    />
  );
}
