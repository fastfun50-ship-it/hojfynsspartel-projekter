"use client";

import Link from "next/link";
import { DEMO_NEXT } from "@/lib/fieldDemo";

export type SagerItem = {
  id: string;
  title: string;
  subtitle: string;
  demo?: boolean;
};

type Props = {
  projects: SagerItem[];
  onOpenSag: (id: string) => void;
};

export default function SagerPage({ projects, onOpenSag }: Props) {
  const demo: SagerItem = {
    id: DEMO_NEXT.id,
    title: `${DEMO_NEXT.address}, ${DEMO_NEXT.city}`,
    subtitle: `${DEMO_NEXT.service} · ${DEMO_NEXT.detail}`,
    demo: true,
  };
  const seen = new Set<string>();
  const list: SagerItem[] = [];
  for (const p of [demo, ...projects]) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    list.push(p);
  }

  return (
    <div className="field-scroll">
      <header className="field-header">
        <h1 className="field-brand">Sager</h1>
        <p className="field-sub">Aktive og seneste jobs</p>
      </header>

      <div className="sager-list">
        {list.map((p) =>
          p.demo ? (
            <button
              key={p.id}
              type="button"
              className="sager-card no-swipe"
              onClick={() => onOpenSag(p.id)}
            >
              <strong>{p.title}</strong>
              <span className="hint">{p.subtitle}</span>
            </button>
          ) : (
            <Link
              key={p.id}
              href={"/app/sag/" + p.id}
              className="sager-card no-swipe"
            >
              <strong>{p.title}</strong>
              <span className="hint">{p.subtitle}</span>
            </Link>
          ),
        )}
      </div>
    </div>
  );
}
