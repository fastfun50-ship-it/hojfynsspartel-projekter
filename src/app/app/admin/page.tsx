"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  STATUS_LABELS,
} from "@/lib/constants";
import { adjustPrice, formatKr } from "@/lib/prices";
import type { Project } from "@/lib/types";

type Firm = { global_prisjustering_procent: number };

export default function AdminPage() {
  const [queue, setQueue] = useState<Project[]>([]);
  const [all, setAll] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Project | null>(null);
  const [firm, setFirm] = useState<Firm | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const [q, a, f] = await Promise.all([
      api<{ projects: Project[] }>("/api/projects?status=afventer_godkendelse"),
      api<{ projects: Project[] }>("/api/projects"),
      api<{ firm: Firm }>("/api/firm"),
    ]);
    setQueue(q.projects);
    setAll(a.projects);
    setFirm(f.firm);
  }

  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, []);

  async function saveFields() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const data = await api<{ project: Project }>("/api/projects/" + selected.id, {
        method: "PATCH",
        body: JSON.stringify({
          title: selected.title,
          category: selected.category,
          scope: selected.scope,
          year: selected.year,
          price_from: selected.price_from,
          price_to: selected.price_to,
          may_show_public: !!selected.may_show_public,
          show_price_on_site: !!selected.show_price_on_site,
        }),
      });
      setSelected(data.project);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gem fejlede");
    } finally {
      setBusy(false);
    }
  }

  async function act(path: string, body?: unknown) {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const data = await api<{ project: Project }>(
        "/api/projects/" + selected.id + "/" + path,
        {
          method: "POST",
          body: JSON.stringify(body || {}),
        },
      );
      setSelected(data.project);
      setRejectNote("");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Handling fejlede");
    } finally {
      setBusy(false);
    }
  }

  const pct = firm?.global_prisjustering_procent ?? 0;

  return (
    <div className="stack">
      <div className="topbar" style={{ marginBottom: 0 }}>
        <h1 style={{ margin: 0, fontSize: "1.3rem" }}>Admin</h1>
        <Link href="/app/admin/indstillinger" className="btn btn-ghost" style={{ width: "auto" }}>
          Firma
        </Link>
      </div>

      {error ? <div className="error">{error}</div> : null}

      <section className="card stack">
        <strong>Kø: afventer godkendelse ({queue.length})</strong>
        {queue.length === 0 ? <p className="hint">Tom kø</p> : null}
        {queue.map((p) => (
          <button
            key={p.id}
            type="button"
            className="btn btn-ghost"
            style={{ justifyContent: "space-between" }}
            onClick={() => setSelected(p)}
          >
            <span>{p.title}</span>
            <span className="badge">{STATUS_LABELS[p.status]}</span>
          </button>
        ))}
      </section>

      <section className="card stack">
        <strong>Alle projekter</strong>
        {all.map((p) => (
          <button
            key={p.id}
            type="button"
            className="btn btn-ghost"
            style={{ justifyContent: "space-between" }}
            onClick={() => setSelected(p)}
          >
            <span>{p.title}</span>
            <span className="badge">{STATUS_LABELS[p.status]}</span>
          </button>
        ))}
      </section>

      {selected ? (
        <section className="card stack">
          <strong>Rediger: {selected.title}</strong>
          <div>
            <label className="label">Titel</label>
            <input
              className="input"
              value={selected.title}
              onChange={(e) => setSelected({ ...selected, title: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Kategori</label>
            <select
              className="select"
              value={selected.category}
              onChange={(e) =>
                setSelected({ ...selected, category: e.target.value as Project["category"] })
              }
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Scope / omfang</label>
            <textarea
              className="textarea"
              value={selected.scope || ""}
              onChange={(e) => setSelected({ ...selected, scope: e.target.value })}
            />
          </div>
          <div>
            <label className="label">År</label>
            <input
              className="input"
              type="number"
              value={selected.year ?? ""}
              onChange={(e) =>
                setSelected({
                  ...selected,
                  year: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </div>
          <div>
            <label className="label">Pris fra (grundpris)</label>
            <input
              className="input"
              type="number"
              value={selected.price_from ?? ""}
              onChange={(e) =>
                setSelected({
                  ...selected,
                  price_from: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
            <p className="hint">
              Vist: {formatKr(adjustPrice(selected.price_from, pct)) || "—"}
            </p>
          </div>
          <div>
            <label className="label">Pris til (grundpris)</label>
            <input
              className="input"
              type="number"
              value={selected.price_to ?? ""}
              onChange={(e) =>
                setSelected({
                  ...selected,
                  price_to: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
            <p className="hint">
              Vist: {formatKr(adjustPrice(selected.price_to, pct)) || "—"}
            </p>
          </div>
          <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={!!selected.may_show_public}
              onChange={(e) =>
                setSelected({ ...selected, may_show_public: e.target.checked ? 1 : 0 })
              }
            />
            Må vises offentligt
          </label>
          <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={!!selected.show_price_on_site}
              onChange={(e) =>
                setSelected({ ...selected, show_price_on_site: e.target.checked ? 1 : 0 })
              }
            />
            Vis pris på site
          </label>

          <button className="btn btn-secondary" disabled={busy} onClick={() => void saveFields()}>
            Gem ændringer
          </button>

          {selected.status === "afventer_godkendelse" ? (
            <>
              <button className="btn btn-primary" disabled={busy} onClick={() => void act("approve")}>
                Godkend
              </button>
              <div>
                <label className="label">Afvisningsnote</label>
                <textarea
                  className="textarea"
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                />
              </div>
              <button
                className="btn btn-danger"
                disabled={busy}
                onClick={() => void act("reject", { note: rejectNote })}
              >
                Afvis
              </button>
            </>
          ) : null}

          {selected.status === "godkendt" || selected.status === "skjult" ? (
            <button className="btn btn-primary" disabled={busy} onClick={() => void act("publish")}>
              Publicér
            </button>
          ) : null}

          {selected.status === "publiceret" ? (
            <button className="btn btn-ghost" disabled={busy} onClick={() => void act("hide")}>
              Skjul
            </button>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
