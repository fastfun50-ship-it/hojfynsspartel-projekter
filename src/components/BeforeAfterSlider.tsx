"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  beforeUrl: string;
  afterUrl: string;
  className?: string;
};

/** Simple one-hand before/after drag slider. Prefer aligned afterUrl. */
export default function BeforeAfterSlider({
  beforeUrl,
  afterUrl,
  className = "",
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(50);
  const [fullW, setFullW] = useState(0);
  const dragging = useRef(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const sync = () => setFullW(el.getBoundingClientRect().width);
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const setFromClientX = useCallback((clientX: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.max(2, Math.min(98, next)));
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    dragging.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    setFromClientX(e.clientX);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    setFromClientX(e.clientX);
  }

  function onPointerUp() {
    dragging.current = false;
  }

  return (
    <div
      ref={wrapRef}
      className={"ba-slider " + className}
      style={{ ["--ba-full-w" as string]: fullW ? fullW + "px" : "100%" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="img"
      aria-label="Før og efter sammenligning"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={beforeUrl} alt="Før" className="ba-slider-before" draggable={false} />
      <div className="ba-slider-after-clip" style={{ width: pos + "%" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={afterUrl} alt="Efter" className="ba-slider-after" draggable={false} />
      </div>
      <div className="ba-slider-handle" style={{ left: pos + "%" }}>
        <span className="ba-slider-knob" />
      </div>
      <span className="ba-slider-label ba-slider-label-l">Før</span>
      <span className="ba-slider-label ba-slider-label-r">Efter</span>
    </div>
  );
}
