/** Shared Danish time-tracking display helpers (client + server safe). */

export function formatLiveElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** e.g. "9 t 40" or "45 min" */
export function formatTotalDuration(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60_000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m} min`;
  return `${h} t ${m}`;
}

export function formatSamletTid(ms: number): string {
  return `Samlet tid ${formatTotalDuration(ms)}`;
}

export function sessionDurationMs(
  startedAt: string,
  endedAt: string | null | undefined,
  now = Date.now(),
): number {
  const start = Date.parse(startedAt);
  if (Number.isNaN(start)) return 0;
  const end = endedAt ? Date.parse(endedAt) : now;
  if (Number.isNaN(end) || end < start) return 0;
  return end - start;
}
