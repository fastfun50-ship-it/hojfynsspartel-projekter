"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Props = {
  isAdmin: boolean;
  logoutAction: () => Promise<void>;
};

function IconPlus() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconLive() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
      <path d="M5 12h2M17 12h2M12 5v2M12 17v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconTag() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 12V5h7l11 11-7 7L3 12Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="7.5" cy="8.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

function IconDots() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="6" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="18" cy="12" r="2" />
    </svg>
  );
}

export default function HomeHub({ isAdmin, logoutAction }: Props) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="hub-grid">
      <Link href="/app/projekter/ny" className="hub-tile">
        <IconPlus />
        Nyt job
      </Link>
      <Link href="/app/projekter" className="hub-tile">
        <IconGrid />
        Projekter
      </Link>
      {isAdmin ? (
        <Link href="/app/admin" className="hub-tile">
          <IconLive />
          På siden
        </Link>
      ) : null}
      <Link href="/projekter" className="hub-tile">
        <IconEye />
        Se sitet
      </Link>
      {isAdmin ? (
        <Link href="/app/admin/indstillinger" className="hub-tile">
          <IconTag />
          Priser
        </Link>
      ) : null}
      <div className="hub-more" ref={menuRef}>
        <button
          type="button"
          className="hub-tile"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((v) => !v)}
        >
          <IconDots />
          Mere
        </button>
        {open ? (
          <div className="more-menu" role="menu">
            {isAdmin ? (
              <Link
                href="/app/admin/indstillinger"
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                Firma
              </Link>
            ) : null}
            <form action={logoutAction}>
              <button type="submit" role="menuitem" className="more-logout">
                Log ud
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}
