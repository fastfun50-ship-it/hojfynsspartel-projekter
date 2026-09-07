"use client";

import { FormEvent, useState } from "react";
import { api } from "@/lib/client";
import { CATEGORIES, CATEGORY_LABELS, DEFAULT_PROJECT_TITLE } from "@/lib/constants";

export default function NewProjectPage() {
  const [title, setTitle] = useState(DEFAULT_PROJECT_TITLE);
  const [category, setCategory] = useState("facade");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api<{ project: { id: string } }>("/api/projects", {
        method: "POST",
        body: JSON.stringify({ title, category, note }),
      });
      // Hard navigation so the detail page hits a fresh request (avoids soft-nav
      // caching / isolate mismatch after create on serverless).
      window.location.assign("/app/projekter/" + data.project.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke oprette");
      setLoading(false);
    }
  }

  return (
    <form className="stack card" onSubmit={onSubmit}>
      <h1 style={{ margin: 0, fontSize: "1.25rem" }}>Nyt projekt</h1>
      {error ? <div className="error">{error}</div> : null}
      <div>
        <label className="label">Titel</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div>
        <label className="label">Kategori</label>
        <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Note (valgfri)</label>
        <textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <button className="btn btn-primary" disabled={loading} type="submit">
        {loading ? "Opretter…" : "Opret"}
      </button>
    </form>
  );
}
