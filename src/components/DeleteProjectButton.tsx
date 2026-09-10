"use client";

import { useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

export default function DeleteProjectButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Slet projektet og billederne?")) return;
    setBusy(true);
    try {
      await api("/api/projects/" + projectId, { method: "DELETE" });
      router.refresh();
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
      onClick={(e) => void onClick(e)}
    >
      Slet
    </button>
  );
}
