"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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
  const swipeDraggingRef = useRef(false);
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);
  const swipeStartScroll = useRef(0);
  const swipeStartPage = useRef(0);
  const swipePointerId = useRef<number | null>(null);
  const swipeLocked = useRef(false);
  const swipeLastX = useRef(0);
  const swipeLastT = useRef(0);
  const swipeVelocity = useRef(0);
  pageRef.current = page;

  const EDGE_GUARD_PX = 20;
  const ACTIVATE_PX = 10;
  const FLING_VX = 0.45; /* px/ms finger velocity */

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
        if (swipeDraggingRef.current) return;
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

  /* Keep field-page-active in sync with scroll position before paint (iOS taps). */
  useLayoutEffect(() => {
    if (swipeDraggingRef.current) return;
    const el = pagerRef.current;
    if (!el) return;
    const w = el.clientWidth || 1;
    const target = page * w;
    if (Math.abs(el.scrollLeft - target) > 1) {
      el.scrollTo({ left: target, behavior: "auto" });
    }
  }, [page]);

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

  function clearSwipe() {
    swipeStartX.current = null;
    swipeStartY.current = null;
    swipePointerId.current = null;
    swipeLocked.current = false;
    swipeDraggingRef.current = false;
    swipeVelocity.current = 0;
    pagerRef.current?.classList.remove("field-pager-dragging");
  }

  function onSwipePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const zone = e.currentTarget;
    const left = zone.getBoundingClientRect().left;
    /* Leave left ~20px for iOS edge back-swipe */
    if (e.clientX - left < EDGE_GUARD_PX) return;
    const el = pagerRef.current;
    if (!el) return;
    swipePointerId.current = e.pointerId;
    swipeStartX.current = e.clientX;
    swipeStartY.current = e.clientY;
    swipeStartScroll.current = el.scrollLeft;
    swipeStartPage.current = pageRef.current;
    swipeLocked.current = false;
    swipeDraggingRef.current = false;
    swipeLastX.current = e.clientX;
    swipeLastT.current = e.timeStamp;
    swipeVelocity.current = 0;
    try {
      zone.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function onSwipePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (swipePointerId.current != null && e.pointerId !== swipePointerId.current) return;
    const startX = swipeStartX.current;
    const startY = swipeStartY.current;
    const el = pagerRef.current;
    if (startX == null || startY == null || !el) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const dt = Math.max(1, e.timeStamp - swipeLastT.current);
    swipeVelocity.current = (e.clientX - swipeLastX.current) / dt;
    swipeLastX.current = e.clientX;
    swipeLastT.current = e.timeStamp;

    if (!swipeLocked.current) {
      if (Math.abs(dx) < ACTIVATE_PX && Math.abs(dy) < ACTIVATE_PX) return;
      /* Vertical dominance — abort; strip is empty so nothing to scroll */
      if (Math.abs(dx) < Math.abs(dy) * 1.1) {
        try {
          e.currentTarget.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        clearSwipe();
        return;
      }
      if (Math.abs(dx) < ACTIVATE_PX) return;
      swipeLocked.current = true;
      swipeDraggingRef.current = true;
      el.classList.add("field-pager-dragging");
    }

    /* Live 1:1 drag — finger left → next page (scrollLeft up) */
    const w = el.clientWidth || 1;
    const max = (TAB_IDS.length - 1) * w;
    const nextLeft = Math.max(0, Math.min(max, swipeStartScroll.current - dx));
    el.scrollLeft = nextLeft;
    if (e.cancelable) e.preventDefault();
  }

  function finishSwipeSnap() {
    const el = pagerRef.current;
    const locked = swipeLocked.current;
    const startPage = swipeStartPage.current;
    const vx = swipeVelocity.current;
    clearSwipe();
    if (!el || !locked) return;

    const w = el.clientWidth || 1;
    let target = Math.round(el.scrollLeft / w);
    /* Fling: even short distance commits next/prev from start page */
    if (vx < -FLING_VX) target = Math.min(TAB_IDS.length - 1, startPage + 1);
    else if (vx > FLING_VX) target = Math.max(0, startPage - 1);
    target = Math.max(0, Math.min(TAB_IDS.length - 1, target));
    goTab(TAB_IDS[target]);
  }

  function onSwipePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (swipePointerId.current != null && e.pointerId !== swipePointerId.current) return;
    /* Include last sample in velocity when possible */
    if (swipeLocked.current && swipeStartX.current != null) {
      const dt = Math.max(1, e.timeStamp - swipeLastT.current);
      if (dt < 48) {
        swipeVelocity.current = (e.clientX - swipeLastX.current) / dt;
      }
    }
    finishSwipeSnap();
  }

  function onSwipePointerCancel(e: React.PointerEvent<HTMLDivElement>) {
    if (swipePointerId.current != null && e.pointerId !== swipePointerId.current) return;
    const el = pagerRef.current;
    const locked = swipeLocked.current;
    const startPage = swipeStartPage.current;
    clearSwipe();
    if (locked && el) {
      goTab(TAB_IDS[Math.max(0, Math.min(TAB_IDS.length - 1, startPage))]);
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
      <div className="field-pager" ref={pagerRef}>
        <section
          className={"field-page" + (page === 0 ? " field-page-active" : "")}
          aria-label="I dag"
          aria-hidden={page !== 0}
          inert={page !== 0 ? true : undefined}
        >
          <IDagPage onOpenSag={openSag} />
        </section>
        <section
          className={"field-page" + (page === 1 ? " field-page-active" : "")}
          aria-label="Uge"
          aria-hidden={page !== 1}
          inert={page !== 1 ? true : undefined}
        >
          <UgePage onOpenSag={openSag} />
        </section>
        <section
          className={"field-page" + (page === 2 ? " field-page-active" : "")}
          aria-label="Sager"
          aria-hidden={page !== 2}
          inert={page !== 2 ? true : undefined}
        >
          <SagerPage projects={projects} onOpenSag={openSag} />
        </section>
        <section
          className={"field-page" + (page === 3 ? " field-page-active" : "")}
          aria-label="Mere"
          aria-hidden={page !== 3}
          inert={page !== 3 ? true : undefined}
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
        onPointerMove={onSwipePointerMove}
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
