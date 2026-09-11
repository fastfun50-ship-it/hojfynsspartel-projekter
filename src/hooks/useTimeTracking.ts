"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import {
  formatLiveElapsed,
  formatSamletTid,
  formatTotalDuration,
  sessionDurationMs,
} from "@/lib/timeFormat";
import type { SagTimeSummary, TimeSession } from "@/lib/timeTypes";

type Overview = {
  active: TimeSession | null;
  closedIds?: string[];
  summary?: SagTimeSummary | null;
  activeSummary?: SagTimeSummary | null;
};

export function useTimeTracking(sagId?: string) {
  const [active, setActive] = useState<TimeSession | null>(null);
  const [summary, setSummary] = useState<SagTimeSummary | null>(null);
  const [closedIds, setClosedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(Date.now());

  const refresh = useCallback(async () => {
    try {
      const url = sagId
        ? "/api/time?sagId=" + encodeURIComponent(sagId)
        : "/api/time";
      const data = await api<Overview & { summary?: SagTimeSummary }>(url);
      setActive(data.active ?? null);
      setClosedIds(data.closedIds || []);
      if (data.summary) setSummary(data.summary);
      else if (data.activeSummary) setSummary(data.activeSummary);
      else if (!sagId) setSummary(null);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke hente tid");
    }
  }, [sagId]);

  useEffect(() => {
    void refresh();
    const poll = setInterval(() => void refresh(), 15_000);
    return () => clearInterval(poll);
  }, [refresh]);

  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const runningHere = !!(active && sagId && active.sag_id === sagId);
  const runningElsewhere = !!(active && sagId && active.sag_id !== sagId);
  const closed = sagId
    ? summary?.closed || closedIds.includes(sagId)
    : false;

  const liveMs = useMemo(() => {
    if (!active) return 0;
    if (sagId && active.sag_id !== sagId) return 0;
    return sessionDurationMs(active.started_at, null, tick);
  }, [active, sagId, tick]);

  const liveLabel = active
    ? formatLiveElapsed(
        sagId && active.sag_id !== sagId
          ? sessionDurationMs(active.started_at, null, tick)
          : liveMs,
      )
    : "";

  const totalMs = useMemo(() => {
    if (!summary) return 0;
    // Recompute with live tick if running on this sag
    if (runningHere && active) {
      const finished = summary.sessions
        .filter((s) => s.ended_at)
        .reduce((acc, s) => acc + sessionDurationMs(s.started_at, s.ended_at, tick), 0);
      return finished + liveMs;
    }
    return summary.totalMs;
  }, [summary, runningHere, active, liveMs, tick]);

  const todayMs = summary?.todayMs ?? 0;

  async function start(id: string) {
    setBusy(true);
    setError("");
    try {
      const data = await api<{
        active: TimeSession | null;
        summary: SagTimeSummary;
        closedIds: string[];
      }>("/api/time/start", {
        method: "POST",
        body: JSON.stringify({ sagId: id }),
      });
      setActive(data.active);
      setSummary(data.summary);
      setClosedIds(data.closedIds || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Start fejlede");
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function stop(id?: string) {
    setBusy(true);
    setError("");
    try {
      const data = await api<{
        active: TimeSession | null;
        summary: SagTimeSummary | null;
        closedIds: string[];
      }>("/api/time/stop", {
        method: "POST",
        body: JSON.stringify(id ? { sagId: id } : {}),
      });
      setActive(data.active);
      if (data.summary) setSummary(data.summary);
      setClosedIds(data.closedIds || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stop fejlede");
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function close(id: string) {
    setBusy(true);
    setError("");
    try {
      const data = await api<{
        active: TimeSession | null;
        summary: SagTimeSummary;
        closedIds: string[];
      }>("/api/time/close", {
        method: "POST",
        body: JSON.stringify({ sagId: id }),
      });
      setActive(data.active);
      setSummary(data.summary);
      setClosedIds(data.closedIds || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Afslut fejlede");
      throw err;
    } finally {
      setBusy(false);
    }
  }


  async function reopen(id: string) {
    setBusy(true);
    setError("");
    try {
      const data = await api<{
        active: TimeSession | null;
        summary: SagTimeSummary;
        closedIds: string[];
      }>("/api/time/reopen", {
        method: "POST",
        body: JSON.stringify({ sagId: id }),
      });
      setActive(data.active);
      setSummary(data.summary);
      setClosedIds(data.closedIds || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Genåbn fejlede");
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function patchSession(
    sessionId: string,
    patch: { started_at?: string; ended_at?: string | null },
  ) {
    setBusy(true);
    setError("");
    try {
      const data = await api<{ session: TimeSession; summary: SagTimeSummary }>(
        "/api/time/sessions/" + sessionId,
        { method: "PATCH", body: JSON.stringify(patch) },
      );
      setSummary(data.summary);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ret tid fejlede");
      throw err;
    } finally {
      setBusy(false);
    }
  }

  return {
    active,
    summary,
    closedIds,
    busy,
    error,
    setError,
    refresh,
    start,
    stop,
    close,
    reopen,
    patchSession,
    runningHere,
    runningElsewhere,
    closed,
    liveMs,
    liveLabel,
    totalMs,
    todayMs,
    formatLiveElapsed,
    formatSamletTid,
    formatTotalDuration,
  };
}
