"use client";

import { useEffect, useRef, useState } from "react";
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
  isAdmin,
  logoutAction,
  children,
}: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const onProjects = pathname === "/app";
  const onNew = pathname?.startsWith("/app/projekter/ny");
  const onAdmin = pathname?.startsWith("/app/admin");

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <div className="brand-name">Højfynsspartel</div>
          <div className="hint">{userName}</div>
        </div>
        <div className="more-wrap" ref={menuRef}>
          <button
            type="button"
            className="icon-btn"
            aria-label="Mere"
            aria-expanded={open}
            aria-haspopup="menu"
            onClick={() => setOpen((v) => !v)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>
          {open ? (
            <div className="more-menu" role="menu">
              {isAdmin ? (
                <Link href="/app/admin" role="menuitem" onClick={() => setOpen(false)}>
                  Admin
                </Link>
              ) : null}
              {isAdmin ? (
                <Link
                  href="/app/admin/indstillinger"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                >
                  Firma
                </Link>
              ) : null}
              <Link href="/projekter" role="menuitem" onClick={() => setOpen(false)}>
                Offentlig side
              </Link>
              <form action={logoutAction}>
                <button type="submit" role="menuitem" className="more-logout">
                  Log ud
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </header>
      <UndoBanner />
      {children}
      <nav className="nav-bottom">
        <Link href="/app" className={onProjects ? "active" : ""}>
          Projekter
        </Link>
        <Link href="/app/projekter/ny" className={onNew ? "active" : ""}>
          Nyt
        </Link>
        {isAdmin ? (
          <Link href="/app/admin" className={onAdmin ? "active" : ""}>
            Admin
          </Link>
        ) : null}
      </nav>
    </div>
  );
}
