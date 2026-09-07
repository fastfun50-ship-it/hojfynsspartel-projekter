import { redirect } from "next/navigation";
import { getEnvStatus } from "@/lib/env";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const status = getEnvStatus();
  if (!status.hasSessionSecret) {
    redirect("/setup");
  }

  const session = await getSession();
  if (session.user) redirect("/app");
  redirect("/login");
}
