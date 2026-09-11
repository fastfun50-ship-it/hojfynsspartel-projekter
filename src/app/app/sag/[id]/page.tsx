import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getProject, getProjectImages, withPublicUrls } from "@/lib/projects";
import SagClient from "./SagClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function SagPage({ params }: Props) {
  const session = await getSession();
  if (!session.user) redirect("/login");
  const { id } = await params;
  const project = await getProject(id);
  if (!project) redirect("/app?tab=sager");
  const images = withPublicUrls(await getProjectImages(id));

  return (
    <SagClient
      projectId={project.id}
      title={project.title}
      initialImages={images}
    />
  );
}
