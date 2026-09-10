"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import {
  LAST_ACTION_EVENT,
  UNDO_TTL_MS,
  clearLastAction,
  readLastAction,
  undoLabel,
  type LastAction,
} from "@/lib/lastAction";

export default function UndoBanner() {
  const [action, setAction] = useState<LastAction | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function refresh() {
      setAction(readLastAction());
    }
    refresh();
    window.addEventListener(LAST_ACTION_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(LAST_ACTION_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    if (!action) return;
    const left = action.at + UNDO_TTL_MS - Date.now();
    if (left <= 0) {
      setAction(null);
      return;
    }
    const t = window.setTimeout(() => setAction(readLastAction()), left);
    return () => window.clearTimeout(t);
  }, [action]);

  async function onUndo() {
    if (!action || busy) return;
    if (!confirm("Fortryd?")) return;
    setBusy(true);
    try {
      await api("/api/projects/" + action.projectId + "/undo", {
        method: "POST",
        body: JSON.stringify({ kind: action.kind }),
      });
      clearLastAction();
      setAction(null);
      window.location.reload();
    } catch (err) {
      clearLastAction();
      setAction(null);
      alert(err instanceof Error ? err.message : "Kunne ikke fortryde");
    } finally {
      setBusy(false);
    }
  }

  if (!action) return null;

  return (
    <p className="undo-bar">
      {undoLabel(action.kind)}{" "}
      <button type="button" onClick={() => void onUndo()} disabled={busy}>
        Fortryd
      </button>
    </p>
  );
}
