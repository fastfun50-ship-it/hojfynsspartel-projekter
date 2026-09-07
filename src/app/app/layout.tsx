import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { hasRole } from "@/lib/constants";
import { logoutAction } from "./actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session.user) redirect("/login");
  const user = session.user;
  const isAdmin = hasRole(user.roles, "admin");

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <div style={{ fontWeight: 800 }}>HFS Foto</div>
          <div className="hint">{user.name}</div>
        </div>
        <form action={logoutAction}>
          <button
            className="btn btn-ghost"
            style={{ width: "auto", minHeight: 40, padding: "0.4rem 0.8rem" }}
            type="submit"
          >
            Log ud
          </button>
        </form>
      </header>
      {children}
      <nav className="nav-bottom">
        <Link href="/app">Projekter</Link>
        {isAdmin ? <Link href="/app/admin">Admin</Link> : <span />}
        <Link href="/projekter">Offentlig</Link>
      </nav>
    </div>
  );
}
