"use client";

import { DEMO_NEXT, DEMO_REST, formatIDagSubtitle } from "@/lib/fieldDemo";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { IconCal, IconClock } from "./FieldIcons";

type Props = {
  onOpenSag: (id: string) => void;
};

export default function IDagPage({ onOpenSag }: Props) {
  const next = DEMO_NEXT;
  const {
    busy,
    error,
    start,
    stop,
    runningHere,
    closed,
    liveLabel,
    totalMs,
    formatSamletTid,
  } = useTimeTracking(next.id);

  async function onPrimary() {
    if (closed) {
      onOpenSag(next.id);
      return;
    }
    try {
      if (runningHere) await stop(next.id);
      else await start(next.id);
    } catch {
      /* error surfaced via hook */
    }
  }

  const primaryLabel = closed
    ? "Se sag"
    : runningHere
      ? "Stop tid"
      : "Start tid";

  return (
    <div className="field-scroll">
      <header className="field-header">
        <h1 className="field-brand">Højfynsspartel</h1>
        <p className="field-sub">{formatIDagSubtitle()}</p>
      </header>

      <div className="idag-layout">
        <article className="naeste-card">
          <div className="naeste-label">NÆSTE</div>
          <button
            type="button"
            className="naeste-addr-btn no-swipe"
            onClick={() => onOpenSag(next.id)}
          >
            <h2 className="naeste-addr">
              {next.address}, {next.city}
            </h2>
          </button>
          <p className="naeste-svc">
            {next.service} · {next.detail}
          </p>
          <p className="naeste-slot">
            <IconClock size={16} />
            <span>{next.slot}</span>
          </p>
          {runningHere ? (
            <p className="naeste-live" aria-live="polite">
              I gang {liveLabel}
            </p>
          ) : null}
          {closed ? (
            <p className="naeste-live naeste-closed" aria-live="polite">
              {formatSamletTid(totalMs)}
            </p>
          ) : null}
          {error ? <p className="error">{error}</p> : null}
          <div className="naeste-actions">
            <button
              type="button"
              className="btn-field btn-field-primary no-swipe"
              disabled={busy}
              onClick={() => void onPrimary()}
            >
              {primaryLabel}
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
    </div>
  );
}
