import { getSession } from "@/lib/session";
import { hasRole } from "@/lib/constants";
import { logoutAction } from "./actions";
import HomeHub from "@/components/HomeHub";

export const dynamic = "force-dynamic";

export default async function AppHomePage() {
  const session = await getSession();
  const isAdmin = session.user ? hasRole(session.user.roles, "admin") : false;

  return <HomeHub isAdmin={isAdmin} logoutAction={logoutAction} />;
}
