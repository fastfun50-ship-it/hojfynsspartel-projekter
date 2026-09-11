"use client";

import { useState } from "react";
import { DEMO_WEEK, DEMO_WEEK_DAYS, isoWeek } from "@/lib/fieldDemo";
import { IconCal, IconClock, IconInfo } from "./FieldIcons";

type Props = {
  onOpenSag: (id: string) => void;
};

export default function UgePage({ onOpenSag }: Props) {
  const [day, setDay] = useState<(typeof DEMO_WEEK_DAYS)[number]["key"]>("tir");
  const slots = DEMO_WEEK[day] || [];

  return (
    <div className="field-scroll">
      <header className="field-header">
        <h1 className="field-brand">Uge {isoWeek()}</h1>
      </header>

      <div className="day-chips no-swipe" role="tablist" aria-label="Ugedage">
        {DEMO_WEEK_DAYS.map((d) => (
          <button
            key={d.key}
            type="button"
            role="tab"
            aria-selected={day === d.key}
            className={"day-chip" + (day === d.key ? " day-chip-active" : "")}
            onClick={() => setDay(d.key)}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="uge-slots">
        {slots.map((s) => (
          <section key={s.slot} className="uge-block">
            <div className="uge-slot-head">
              <IconClock size={18} />
              <span>{s.slot}</span>
            </div>
            {s.kind === "job" ? (
              <button
                type="button"
                className="uge-job no-swipe"
                onClick={() => onOpenSag(s.jobId)}
              >
                <strong>{s.city}</strong>
                <span>{s.service}</span>
                <span>{s.contact}</span>
              </button>
            ) : (
              <div className="uge-ledig">
                <IconCal size={18} />
                <span>Ledig · nyt kig</span>
              </div>
            )}
          </section>
        ))}
      </div>

      <p className="uge-note">
        <IconInfo />
        <span>Sitet bekræfter stadig manuelt</span>
      </p>
    </div>
  );
}
