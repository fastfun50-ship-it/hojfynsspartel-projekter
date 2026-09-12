"use client";

import type { ReactNode } from "react";
import { FIELD_TABS, type FieldTabId } from "@/lib/fieldDemo";
import {
  IconTabJob,
  IconTabRum,
  IconTabMaterialer,
  IconTabResultat,
  IconTabMere,
} from "./FieldIcons";

/** Locked bottom-tab copy — never derive from route, title, or Mere submenu. */
export const FIELD_TAB_LABELS = {
  job: "Job",
  rum: "Rum",
  materialer: "Materialer",
  resultat: "Resultat",
  mere: "Mere",
} as const satisfies Record<FieldTabId, string>;

const TAB_ICONS: Record<FieldTabId, ReactNode> = {
  job: <IconTabJob />,
  rum: <IconTabRum />,
  materialer: <IconTabMaterialer />,
  resultat: <IconTabResultat />,
  mere: <IconTabMere />,
};

type Props = {
  active: FieldTabId | null;
  /** Field home: in-shell buttons. Omit for Mere children → native <a href>. */
  onSelect?: (id: FieldTabId) => void;
  fixed?: boolean;
};

export default function FieldTabBar({ active, onSelect, fixed }: Props) {
  const navClass =
    "field-tabs field-tabs-5" + (fixed ? " field-tabs-fixed" : "");

  return (
    <nav className={navClass} aria-label="Hovedmenu">
      {FIELD_TABS.map((t) => {
        const label = FIELD_TAB_LABELS[t.id];
        const className =
          "field-tab no-swipe" +
          (active === t.id ? " field-tab-active" : "") +
          (t.id === "materialer" ? " field-tab-center" : "");
        const inner = (
          <>
            <span className="field-tab-icon" aria-hidden>
              {TAB_ICONS[t.id]}
            </span>
            <span className="field-tab-label">{label}</span>
            {active === t.id ? <span className="field-tab-line" /> : null}
          </>
        );

        if (onSelect) {
          return (
            <button
              key={t.id}
              type="button"
              className={className}
              onClick={() => onSelect(t.id)}
            >
              {inner}
            </button>
          );
        }

        /* Native <a>: iOS field-pager / client Link can swallow Mere-child nav. */
        return (
          <a key={t.id} href={"/app?tab=" + t.id} className={className}>
            {inner}
          </a>
        );
      })}
    </nav>
  );
}
