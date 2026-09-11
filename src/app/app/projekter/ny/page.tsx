"use client";

import { FormEvent, useState } from "react";
import { api } from "@/lib/client";

export default function NewProjectPage() {
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api<{ project: { id: string } }>("/api/projects", {
        method: "POST",
        body: JSON.stringify({ address, phone, customerName }),
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
      <h1 className="page-title">Ny sag</h1>
      {error ? <div className="error">{error}</div> : null}
      <div>
        <label className="label">Adresse</label>
        <input
          className="input"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
          autoComplete="street-address"
        />
      </div>
      <div>
        <label className="label">Telefon</label>
        <input
          className="input"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          autoComplete="tel"
        />
      </div>
      <div>
        <label className="label">Navn (valgfri)</label>
        <input
          className="input"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          autoComplete="name"
        />
      </div>
      <button className="btn btn-primary" disabled={loading} type="submit">
        {loading ? "Opretter…" : "Opret"}
      </button>
    </form>
  );
}
