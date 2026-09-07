import { redirect } from "next/navigation";
import { getEnvStatus } from "@/lib/env";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const status = getEnvStatus();
  if (!status.hasSessionSecret) {
    redirect("/setup");
  }
  return <LoginForm />;
}
