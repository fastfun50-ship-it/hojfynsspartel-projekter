"use client";

import { DEMO_NEXT, DEMO_REST } from "@/lib/fieldDemo";
import { IconCal, IconClock } from "./FieldIcons";

type Props = {
  onOpenSag: (id: string) => void;
};

export default function IDagPage({ onOpenSag }: Props) {
  const next = DEMO_NEXT;

  function here() {
    try {
      localStorage.setItem("hfs-field-here", JSON.stringify({ id: next.id, at: Date.now() }));
    } catch {
      /* ignore */
    }
    onOpenSag(next.id);
  }

  return (
    <div className="field-scroll">
      <header className="field-header">
        <h1 className="field-brand">Højfynsspartel</h1>
        <p className="field-sub">I dag · tir 15. sep</p>
      </header>

      <article className="naeste-card">
        <div className="naeste-label">NÆSTE</div>
        <h2 className="naeste-addr">
          {next.address}, {next.city}
        </h2>
        <p className="naeste-svc">
          {next.service} · {next.detail}
        </p>
        <p className="naeste-slot">
          <IconClock size={16} />
          <span>{next.slot}</span>
        </p>
        <div className="naeste-actions">
          <button type="button" className="btn-field btn-field-primary no-swipe" onClick={here}>
            Jeg er her
          </button>
          <a href={`tel:${next.phone}`} className="btn-field btn-field-outline no-swipe">
            Ring kunden
          </a>
        </div>
      </article>

      <ul className="rest-list">
        {DEMO_REST.map((row) => (
          <li key={row.id} className="rest-row">
            <IconCal size={18} />
            <span>{row.line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
