"use client";

/* Native <a href> required: iOS field-pager swallows router.push / client Link nav. */
/* eslint-disable @next/next/no-html-link-for-pages */

import { useEffect, useRef, useState } from "react";
import type { JobListItem } from "./JobPage";
import { FIELD_STATUS_LABELS } from "@/lib/fieldStatus";

type Props = {
  isAdmin: boolean;
  logoutAction: () => Promise<void>;
  activeJob?: JobListItem | null;
};

function IconPlus() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconEye() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
function IconTag() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3 12V5h7l11 11-7 7L3 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="7.5" cy="8.5" r="1.2" fill="currentColor" />
    </svg>
  );
}
function IconGrid() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
function IconLive() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 12h2M17 12h2M12 5v2M12 17v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export default function MerePage({ isAdmin, logoutAction, activeJob }: Props) {
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
    <div className="field-scroll">
      <header className="field-header">
        <h1 className="field-brand">Mere</h1>
        <p className="field-sub">Kunde, deling og indstillinger</p>
      </header>

      {activeJob ? (
        <section className="mere-job-card">
          <h2 className="mere-job-name">{activeJob.customerName}</h2>
          <p className="hint">
            {[activeJob.title, activeJob.city].filter(Boolean).join(" · ")}
          </p>
          <p className="hint">
            {FIELD_STATUS_LABELS[activeJob.fieldStatus]}
            {activeJob.phone ? ` · ${activeJob.phone}` : ""}
          </p>
          {activeJob.phone ? (
            <a href={`tel:${activeJob.phone}`} className="mere-row no-swipe" style={{ marginTop: "0.75rem" }}>
              Ring til kunde
            </a>
          ) : null}
          <a
            href={`/app/sag/${activeJob.id}`}
            className="mere-row no-swipe"
            style={{ marginTop: "0.5rem" }}
          >
            <IconClock />
            <span>Tid på job (Start/Stop)</span>
          </a>
        </section>
      ) : (
        <p className="hint">Vælg et job under Job for kundedetaljer.</p>
      )}

      <div className="mere-stack">
        <a href="/app/projekter/ny" className="mere-row no-swipe">
          <IconPlus />
          <span>Ny sag (fuld)</span>
        </a>
        <a href="/projekter" className="mere-row no-swipe">
          <IconEye />
          <span>Se sitet / del-link</span>
        </a>
        <a href="/app/admin/indstillinger" className="mere-row no-swipe">
          <IconTag />
          <span>Priser</span>
        </a>

        <div className="mere-divider" />
        <p className="mere-legacy-label">Gammelt / admin</p>

        <a href="/app/projekter" className="mere-row mere-row-muted no-swipe">
          <IconGrid />
          <span>Projekter (grid)</span>
        </a>
        <a href="/app/admin" className="mere-row mere-row-muted no-swipe">
          <IconLive />
          <span>På siden / admin</span>
        </a>

        <div className="mere-more" ref={menuRef}>
          <button
            type="button"
            className="mere-row mere-row-muted no-swipe"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span style={{ width: 22, textAlign: "center" }}>···</span>
            <span>Konto</span>
          </button>
          {open ? (
            <div className="more-menu" role="menu">
              {isAdmin ? (
                <a href="/app/admin/indstillinger" role="menuitem" onClick={() => setOpen(false)}>
                  Firma
                </a>
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
    </div>
  );
}
