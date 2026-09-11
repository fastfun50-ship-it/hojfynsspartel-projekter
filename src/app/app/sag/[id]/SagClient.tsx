"use client";

import { useRouter } from "next/navigation";
import SagView from "@/components/field/SagView";
import type { ProjectImage } from "@/lib/types";

type Img = ProjectImage & { url: string };

export default function SagClient({
  projectId,
  title,
  initialImages,
}: {
  projectId: string;
  title: string;
  initialImages: Img[];
}) {
  const router = useRouter();
  return (
    <SagView
      mode="project"
      projectId={projectId}
      title={title}
      initialImages={initialImages}
      onBack={() => router.push("/app?tab=sager")}
    />
  );
}
