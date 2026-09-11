"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FIELD_TABS,
  type FieldTabId,
  DEMO_NEXT,
} from "@/lib/fieldDemo";
import IDagPage from "./IDagPage";
import UgePage from "./UgePage";
import SagerPage, { type SagerItem } from "./SagerPage";
import MerePage from "./MerePage";
import SagView from "./SagView";

type Props = {
  isAdmin: boolean;
  logoutAction: () => Promise<void>;
  projects: SagerItem[];
};

const TAB_INDEX: Record<FieldTabId, number> = {
  idag: 0,
  uge: 1,
  sager: 2,
  mere: 3,
};

function tabFromParam(raw: string | null): FieldTabId {
  if (raw === "uge" || raw === "sager" || raw === "mere" || raw === "idag") return raw;
  return "idag";
}

export default function FieldShell({ isAdmin, logoutAction, projects }: Props) {
  const router = useRouter();
  const search = useSearchParams();
  const initialTab = tabFromParam(search.get("tab"));
  const [page, setPage] = useState(TAB_INDEX[initialTab]);
  const [demoSag, setDemoSag] = useState(false);
  const pagerRef = useRef<HTMLDivElement>(null);
  const lockSwipe = useRef(false);

  const scrollTo = useCallback((idx: number, smooth = true) => {
    const el = pagerRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: smooth ? "smooth" : "auto" });
  }, []);

  useEffect(() => {
    const idx = TAB_INDEX[tabFromParam(search.get("tab"))];
    setPage(idx);
    scrollTo(idx, false);
  }, [search, scrollTo]);

  useEffect(() => {
    const el = pagerRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const w = el.clientWidth || 1;
        const idx = Math.round(el.scrollLeft / w);
        setPage((p) => (p === idx ? p : idx));
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
    };
  }, []);

  function goTab(id: FieldTabId) {
    const idx = TAB_INDEX[id];
    setPage(idx);
    scrollTo(idx, true);
    router.replace("/app?tab=" + id, { scroll: false });
  }

  function openSag(id: string) {
    if (id === DEMO_NEXT.id || id.startsWith("demo-")) {
      setDemoSag(true);
      return;
    }
    router.push("/app/sag/" + id);
  }

  function onTouchStartCapture(e: React.TouchEvent) {
    const t = e.target as HTMLElement | null;
    if (t?.closest?.(".no-swipe")) {
      lockSwipe.current = true;
      if (pagerRef.current) pagerRef.current.style.overflowX = "hidden";
    } else {
      lockSwipe.current = false;
    }
  }

  function onTouchEndCapture() {
    if (lockSwipe.current && pagerRef.current) {
      pagerRef.current.style.overflowX = "";
      lockSwipe.current = false;
    }
  }

  if (demoSag) {
    return (
      <SagView
        mode="demo"
        title={DEMO_NEXT.titleShort}
        onBack={() => setDemoSag(false)}
      />
    );
  }

  return (
    <div className="field-root">
      <div className="field-edge-guard" aria-hidden />
      <div
        className="field-pager"
        ref={pagerRef}
        onTouchStartCapture={onTouchStartCapture}
        onTouchEndCapture={onTouchEndCapture}
        onTouchCancelCapture={onTouchEndCapture}
      >
        <section className="field-page" aria-label="I dag">
          <IDagPage onOpenSag={openSag} />
        </section>
        <section className="field-page" aria-label="Uge">
          <UgePage onOpenSag={openSag} />
        </section>
        <section className="field-page" aria-label="Sager">
          <SagerPage projects={projects} onOpenSag={openSag} />
        </section>
        <section className="field-page" aria-label="Mere">
          <MerePage isAdmin={isAdmin} logoutAction={logoutAction} />
        </section>
      </div>

      <nav className="field-tabs" aria-label="Hovedmenu">
        {FIELD_TABS.map((t, i) => (
          <button
            key={t.id}
            type="button"
            className={"field-tab no-swipe" + (page === i ? " field-tab-active" : "")}
            onClick={() => goTab(t.id)}
          >
            <span>{t.label}</span>
            {page === i ? <span className="field-tab-line" /> : null}
          </button>
        ))}
      </nav>
    </div>
  );
}
