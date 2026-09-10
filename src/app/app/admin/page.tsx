"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { STATUS_LABELS } from "@/lib/constants";
import { saveLastAction } from "@/lib/lastAction";
import type { Project } from "@/lib/types";
import ProjectCard from "@/components/ProjectCard";

type Row = Project & { coverUrl: string | null };

export default function AdminPage() {
  const [queue, setQueue] = useState<Row[]>([]);
  const [all, setAll] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const [q, a] = await Promise.all([
      api<{ projects: Row[] }>("/api/projects?status=afventer_godkendelse"),
      api<{ projects: Row[] }>("/api/projects"),
    ]);
    setQueue(q.projects);
    setAll(a.projects);
  }

  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, []);

  async function publish(id: string) {
    setBusy(true);
    setError("");
    try {
      await api("/api/projects/" + id + "/publish", {
        method: "POST",
        body: "{}",
      });
      saveLastAction("publish", id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publicering fejlede");
    } finally {
      setBusy(false);
    }
  }

  async function reject(id: string) {
    setBusy(true);
    setError("");
    try {
      await api("/api/projects/" + id + "/reject", {
        method: "POST",
        body: "{}",
      });
      saveLastAction("reject", id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Afvisning fejlede");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <h1 className="page-title">Admin</h1>

      {error ? <div className="error">{error}</div> : null}

      <section className="stack">
        <strong>Afventer ({queue.length})</strong>
        {queue.length === 0 ? <p className="hint">Tom kø</p> : null}
        {queue.map((p) => (
          <ProjectCard
            key={p.id}
            href={"/app/projekter/" + p.id}
            title={p.title}
            coverUrl={p.coverUrl}
            badge={STATUS_LABELS[p.status]}
            deleteId={p.id}
          >
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() => void publish(p.id)}
            >
              Publicér
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={() => void reject(p.id)}
            >
              Afvis
            </button>
          </ProjectCard>
        ))}
      </section>

      <section className="stack">
        <strong>Alle projekter</strong>
        {all.length === 0 ? <p className="hint">Ingen projekter</p> : null}
        {all.map((p) => (
          <ProjectCard
            key={p.id}
            href={"/app/projekter/" + p.id}
            title={p.title}
            coverUrl={p.coverUrl}
            badge={STATUS_LABELS[p.status]}
            deleteId={p.id}
          />
        ))}
      </section>
    </div>
  );
}
