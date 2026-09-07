"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import type { Firm, PriceAdjustmentLog } from "@/lib/types";

export default function FirmSettingsPage() {
  const [firm, setFirm] = useState<Firm | null>(null);
  const [logs, setLogs] = useState<PriceAdjustmentLog[]>([]);
  const [pct, setPct] = useState("0");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await api<{ firm: Firm; logs: PriceAdjustmentLog[] }>("/api/firm");
    setFirm(data.firm);
    setLogs(data.logs);
    setPct(String(data.firm.global_prisjustering_procent ?? 0));
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api<{ firm: Firm; logs: PriceAdjustmentLog[] }>(
        "/api/firm/price-adjustment",
        { method: "POST", body: JSON.stringify({ procent: Number(pct) }) },
      );
      setFirm(data.firm);
      setLogs(data.logs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke gemme");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <Link href="/app/admin" className="hint">← Tilbage til admin</Link>
      <h1 style={{ margin: 0, fontSize: "1.3rem" }}>Firmaindstillinger</h1>
      {error ? <div className="error">{error}</div> : null}
      <form className="card stack" onSubmit={onSubmit}>
        <div>
          <label className="label">Global prisjustering (%)</label>
          <input
            className="input"
            type="number"
            step="0.1"
            value={pct}
            onChange={(e) => setPct(e.target.value)}
          />
          <p className="hint">
            Nuværende: {firm?.global_prisjustering_procent ?? "—"}%. Viste priser =
            rundet til nærmeste 1000 efter justering.
          </p>
        </div>
        <button className="btn btn-primary" disabled={busy} type="submit">
          Gem justering
        </button>
      </form>
      <section className="card stack">
        <strong>Log</strong>
        {logs.length === 0 ? <p className="hint">Ingen logposter</p> : null}
        {logs.map((l) => (
          <div key={l.id} className="hint">
            {new Date(l.created_at).toLocaleString("da-DK")} — {l.procent}%
          </div>
        ))}
      </section>
    </div>
  );
}
