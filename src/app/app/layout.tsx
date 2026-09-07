import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { hasRole } from "@/lib/constants";
import { logoutAction } from "./actions";
import AppChrome from "@/components/AppChrome";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session.user) redirect("/login");
  const user = session.user;
  const isAdmin = hasRole(user.roles, "admin");

  return (
    <AppChrome userName={user.name} isAdmin={isAdmin} logoutAction={logoutAction}>
      {children}
    </AppChrome>
  );
}
