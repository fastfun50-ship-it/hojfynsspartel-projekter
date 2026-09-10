"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import UndoBanner from "./UndoBanner";

type Props = {
  userName: string;
  isAdmin: boolean;
  logoutAction: () => Promise<void>;
  children: React.ReactNode;
};

export default function AppChrome({
  userName,
  children,
}: Props) {
  const pathname = usePathname();
  const onHome = pathname === "/app";
  const onNew = pathname?.startsWith("/app/projekter/ny");
  const onProjects =
    !!pathname?.startsWith("/app/projekter") && !onNew;

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <div className="brand-name">Højfynsspartel</div>
          <div className="hint">{userName}</div>
        </div>
      </header>
      <UndoBanner />
      {children}
      <nav className="nav-bottom">
        <Link href="/app" className={onHome ? "active" : ""}>
          Hjem
        </Link>
        <Link href="/app/projekter/ny" className={onNew ? "active" : ""}>
          Nyt
        </Link>
        <Link href="/app/projekter" className={onProjects ? "active" : ""}>
          Projekter
        </Link>
      </nav>
    </div>
  );
}
