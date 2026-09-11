"use client";

import { useState } from "react";
import Link from "next/link";
import { DEMO_NEXT } from "@/lib/fieldDemo";
import SagView from "./SagView";

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

function isTabletViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(min-width: 768px)").matches;
}

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

  const [selected, setSelected] = useState<SagerItem>(demo);

  function onPick(p: SagerItem, e?: React.MouseEvent) {
    if (isTabletViewport()) {
      e?.preventDefault();
      setSelected(p);
      return true;
    }
    return false;
  }

  return (
    <div className="field-scroll sager-scroll">
      <header className="field-header">
        <h1 className="field-brand">Sager</h1>
        <p className="field-sub">Aktive og seneste jobs</p>
      </header>

      <div className="sager-split">
        <div className="sager-list-pane">
          <div className="sager-list">
            {list.map((p) =>
              p.demo ? (
                <button
                  key={p.id}
                  type="button"
                  className={
                    "sager-card no-swipe" +
                    (selected.id === p.id ? " sager-card-active" : "")
                  }
                  onClick={(e) => {
                    if (onPick(p, e)) return;
                    onOpenSag(p.id);
                  }}
                >
                  <strong>{p.title}</strong>
                  <span className="hint">{p.subtitle}</span>
                </button>
              ) : (
                <Link
                  key={p.id}
                  href={"/app/sag/" + p.id}
                  className={
                    "sager-card no-swipe" +
                    (selected.id === p.id ? " sager-card-active" : "")
                  }
                  onClick={(e) => {
                    if (onPick(p, e)) e.preventDefault();
                  }}
                >
                  <strong>{p.title}</strong>
                  <span className="hint">{p.subtitle}</span>
                </Link>
              ),
            )}
          </div>
        </div>

        <div className="sager-detail-pane" aria-label="Sagdetalje">
          {selected.demo ? (
            <SagView
              mode="demo"
              title={DEMO_NEXT.titleShort}
              onBack={() => setSelected(demo)}
              embedded
            />
          ) : (
            <SagView
              mode="project"
              projectId={selected.id}
              title={selected.title}
              onBack={() => setSelected(demo)}
              embedded
            />
          )}
        </div>
      </div>
    </div>
  );
}
