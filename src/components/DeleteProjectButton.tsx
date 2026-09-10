"use client";

import { useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

export default function DeleteProjectButton({
  projectId,
  redirectTo,
}: {
  projectId: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Slet projektet og billederne?")) return;
    setBusy(true);
    try {
      await api("/api/projects/" + projectId, { method: "DELETE" });
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Kunne ikke slette");
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className="btn-delete"
      disabled={busy}
      aria-label="Slet projekt"
      onClick={(e) => void onClick(e)}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V5h6v2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {busy ? "Sletter…" : "Slet"}
    </button>
  );
}
