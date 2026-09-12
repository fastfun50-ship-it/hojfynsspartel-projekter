"use client";

import { FormEvent, useState } from "react";
import { api } from "@/lib/client";
import {
  FIELD_STATUS_LABELS,
  inferFieldStatus,
  type FieldStatus,
} from "@/lib/fieldStatus";
import { formatDkM2 } from "@/lib/rooms";

export type JobListItem = {
  id: string;
  title: string;
  customerName: string;
  city: string;
  fieldStatus: FieldStatus;
  roomCount: number;
  totalKvm: number | null;
  updatedAt: string;
  phone?: string | null;
};

type Props = {
  jobs: JobListItem[];
  activeJobId: string | null;
  onSelectJob: (id: string) => void;
  onCreated: (job: JobListItem) => void;
  onRefresh: () => void;
};

function relativeUpdated(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Opdateret —";
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (startToday.getTime() - startThat.getTime()) / 86400000,
  );
  if (diffDays <= 0) return "Opdateret i dag";
  if (diffDays === 1) return "Opdateret i går";
  if (diffDays < 7) return `Opdateret for ${diffDays} dage siden`;
  return `Opdateret ${d.getDate()}.${d.getMonth() + 1}`;
}

const HOUSE_TONES = ["job-house-a", "job-house-b", "job-house-c"] as const;

function IconHouse() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-5H10v5H5a1 1 0 0 1-1-1v-8.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function JobPage({
  jobs,
  activeJobId,
  onSelectJob,
  onCreated,
}: Props) {
  const [showNew, setShowNew] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api<{
        project: {
          id: string;
          title: string;
          customer_name?: string | null;
          city?: string | null;
          phone?: string | null;
          field_status?: string | null;
          status: string;
          updated_at: string;
        };
      }>("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          address: address || customerName || "Ny sag",
          phone,
          customerName,
          city,
        }),
      });
      const p = data.project;
      const item: JobListItem = {
        id: p.id,
        title: p.title,
        customerName: p.customer_name || customerName || p.title,
        city: p.city || city || "",
        fieldStatus: inferFieldStatus(p.field_status, p.status),
        roomCount: 0,
        totalKvm: null,
        updatedAt: p.updated_at,
        phone: p.phone || phone || null,
      };
      setShowNew(false);
      setCustomerName("");
      setCity("");
      setAddress("");
      setPhone("");
      onCreated(item);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke oprette");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="field-scroll job-scroll">
      <header className="job-header">
        <div className="job-header-titles">
          <h1 className="job-brand">HFS Foto</h1>
          <p className="job-sub">Jobs</p>
        </div>
      </header>

      {error ? <div className="error">{error}</div> : null}

      <div className="job-list">
        {jobs.length === 0 ? (
          <p className="hint">Ingen jobs endnu. Opret det første.</p>
        ) : (
          jobs.map((j, i) => (
            <button
              key={j.id}
              type="button"
              className={
                "job-card no-swipe" +
                (activeJobId === j.id ? " job-card-active" : "")
              }
              onClick={() => onSelectJob(j.id)}
            >
              <span
                className={"job-house " + HOUSE_TONES[i % HOUSE_TONES.length]}
              >
                <IconHouse />
              </span>
              <span className="job-card-body">
                <strong className="job-card-name">
                  {j.customerName || j.title}
                </strong>
                <span className="job-card-city">
                  {j.city || FIELD_STATUS_LABELS[j.fieldStatus]}
                </span>
                <span className="job-card-meta">
                  {j.roomCount} rum
                  {j.totalKvm != null ? ` · ${formatDkM2(j.totalKvm)}` : ""}
                  {" · "}
                  {relativeUpdated(j.updatedAt)}
                </span>
              </span>
              <span className="job-card-chevron" aria-hidden>
                ›
              </span>
            </button>
          ))
        )}
      </div>

      {showNew ? (
        <form className="job-new-form card-dark" onSubmit={onSubmit}>
          <label className="label">
            Kunde
            <input
              className="input"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
              autoComplete="name"
            />
          </label>
          <label className="label">
            By
            <input
              className="input"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              autoComplete="address-level2"
            />
          </label>
          <label className="label">
            Adresse
            <input
              className="input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              autoComplete="street-address"
            />
          </label>
          <label className="label">
            Telefon
            <input
              className="input"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />
          </label>
          <div className="job-new-actions">
            <button
              type="button"
              className="btn-field btn-field-outline no-swipe"
              onClick={() => setShowNew(false)}
            >
              Annuller
            </button>
            <button
              type="submit"
              className="btn-field btn-field-primary no-swipe"
              disabled={loading}
            >
              {loading ? "Opretter…" : "Opret"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="field-primary-slot">
        <button
          type="button"
          className="btn-field btn-field-primary no-swipe"
          onClick={() => setShowNew(true)}
        >
          + Nyt job
        </button>
      </div>
    </div>
  );
}
