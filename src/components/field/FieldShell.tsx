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

const TAB_IDS = FIELD_TABS.map((t) => t.id);

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
  const pageRef = useRef(page);
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);
  const swipePointerId = useRef<number | null>(null);
  pageRef.current = page;

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

  function finishSwipe(clientX: number, clientY: number) {
    const startX = swipeStartX.current;
    const startY = swipeStartY.current;
    swipeStartX.current = null;
    swipeStartY.current = null;
    swipePointerId.current = null;
    if (startX == null || startY == null) return;
    const dx = clientX - startX;
    const dy = clientY - startY;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.15) return;
    const next = dx < 0 ? pageRef.current + 1 : pageRef.current - 1;
    if (next < 0 || next >= TAB_IDS.length) return;
    goTab(TAB_IDS[next]);
  }

  function onSwipePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    swipePointerId.current = e.pointerId;
    swipeStartX.current = e.clientX;
    swipeStartY.current = e.clientY;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function onSwipePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (swipePointerId.current != null && e.pointerId !== swipePointerId.current) return;
    finishSwipe(e.clientX, e.clientY);
  }

  function onSwipePointerCancel(e: React.PointerEvent<HTMLDivElement>) {
    if (swipePointerId.current != null && e.pointerId !== swipePointerId.current) return;
    swipeStartX.current = null;
    swipeStartY.current = null;
    swipePointerId.current = null;
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
      <div className="field-pager" ref={pagerRef}>
        <section
          className={"field-page" + (page === 0 ? " field-page-active" : "")}
          aria-label="I dag"
          aria-hidden={page !== 0}
        >
          <IDagPage onOpenSag={openSag} />
        </section>
        <section
          className={"field-page" + (page === 1 ? " field-page-active" : "")}
          aria-label="Uge"
          aria-hidden={page !== 1}
        >
          <UgePage onOpenSag={openSag} />
        </section>
        <section
          className={"field-page" + (page === 2 ? " field-page-active" : "")}
          aria-label="Sager"
          aria-hidden={page !== 2}
        >
          <SagerPage projects={projects} onOpenSag={openSag} />
        </section>
        <section
          className={"field-page" + (page === 3 ? " field-page-active" : "")}
          aria-label="Mere"
          aria-hidden={page !== 3}
        >
          <MerePage isAdmin={isAdmin} logoutAction={logoutAction} />
        </section>
      </div>

      {/* Dedicated ~1cm black thumb-swipe strip ABOVE tabs — owns horizontal pan */}
      <div
        className="field-swipe-zone"
        role="presentation"
        aria-hidden
        onPointerDown={onSwipePointerDown}
        onPointerUp={onSwipePointerUp}
        onPointerCancel={onSwipePointerCancel}
      />

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
