"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <div style={{ fontWeight: 800 }}>HFS Foto</div>
          <div className="hint">{userName}</div>
        </div>
        <div className="more-wrap" ref={menuRef}>
          <button
            type="button"
            className="btn btn-ghost more-btn"
            aria-expanded={open}
            aria-haspopup="menu"
            onClick={() => setOpen((v) => !v)}
          >
            Mere
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
      {children}
      <nav className="nav-bottom">
        <Link href="/app" className={pathname === "/app" ? "active" : ""}>
          Projekter
        </Link>
        <Link
          href="/app/projekter/ny"
          className={pathname?.startsWith("/app/projekter/ny") ? "active" : ""}
        >
          Nyt
        </Link>
      </nav>
    </div>
  );
}
