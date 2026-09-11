import { randomUUID } from "node:crypto";
import type { Db } from "./db";
import { sessionDurationMs } from "./timeFormat";
import type { TimeSession, FieldSagState, SagTimeSummary } from "./timeTypes";
export type { TimeSession, FieldSagState, SagTimeSummary } from "./timeTypes";

function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export async function getActiveSession(
  db: Db,
  userId: string,
): Promise<TimeSession | undefined> {
  return db.get<TimeSession>(
    "SELECT * FROM time_sessions WHERE user_id = ? AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1",
    [userId],
  );
}

export async function listSessionsForSag(
  db: Db,
  sagId: string,
): Promise<TimeSession[]> {
  return db.all<TimeSession>(
    "SELECT * FROM time_sessions WHERE sag_id = ? ORDER BY started_at DESC",
    [sagId],
  );
}

export async function getSagState(
  db: Db,
  sagId: string,
): Promise<FieldSagState | undefined> {
  return db.get<FieldSagState>("SELECT * FROM field_sag_state WHERE sag_id = ?", [
    sagId,
  ]);
}

export async function isSagClosed(db: Db, sagId: string): Promise<boolean> {
  const row = await getSagState(db, sagId);
  return row?.status === "closed";
}

export async function summarizeSag(
  db: Db,
  sagId: string,
  userId?: string,
  now = Date.now(),
): Promise<SagTimeSummary> {
  const sessions = await listSessionsForSag(db, sagId);
  const state = await getSagState(db, sagId);
  const closed = state?.status === "closed";
  let totalMs = 0;
  let todayMs = 0;
  const day = todayKey(new Date(now));
  let active: TimeSession | null = null;

  for (const s of sessions) {
    const ms = sessionDurationMs(s.started_at, s.ended_at, now);
    totalMs += ms;
    const startDay = s.started_at.slice(0, 10);
    if (startDay === day || (!s.ended_at && day === todayKey())) {
      // Attribute running + sessions that started today to today
      if (startDay === day) todayMs += ms;
      else if (!s.ended_at) {
        // running overnight: count from midnight today
        const midnight = Date.parse(day + "T00:00:00.000Z");
        todayMs += Math.max(0, now - midnight);
      }
    }
    if (!s.ended_at && (!userId || s.user_id === userId)) {
      active = s;
    }
  }

  return {
    sagId,
    closed,
    closedAt: state?.closed_at ?? null,
    totalMs,
    todayMs,
    active,
    sessions,
  };
}

/** Stop every running session for this user. Returns stopped count. */
export async function stopActiveForUser(
  db: Db,
  userId: string,
  atIso = new Date().toISOString(),
): Promise<number> {
  const running = await db.all<TimeSession>(
    "SELECT * FROM time_sessions WHERE user_id = ? AND ended_at IS NULL",
    [userId],
  );
  for (const s of running) {
    await db.run(
      "UPDATE time_sessions SET ended_at = ?, updated_at = ? WHERE id = ?",
      [atIso, atIso, s.id],
    );
  }
  return running.length;
}

export async function startSession(
  db: Db,
  userId: string,
  sagId: string,
): Promise<TimeSession> {
  if (await isSagClosed(db, sagId)) {
    throw new Error("Sagen er afsluttet");
  }
  const now = new Date().toISOString();
  // Only ONE active timer per user — auto-stop others (incl. other sager)
  await stopActiveForUser(db, userId, now);

  const session: TimeSession = {
    id: randomUUID(),
    sag_id: sagId,
    user_id: userId,
    started_at: now,
    ended_at: null,
    created_at: now,
    updated_at: now,
  };
  await db.run(
    `INSERT INTO time_sessions (id, sag_id, user_id, started_at, ended_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, NULL, ?, ?)`,
    [session.id, session.sag_id, session.user_id, session.started_at, session.created_at, session.updated_at],
  );
  return session;
}

export async function stopSessionForSag(
  db: Db,
  userId: string,
  sagId?: string,
): Promise<TimeSession | null> {
  const active = await getActiveSession(db, userId);
  if (!active) return null;
  if (sagId && active.sag_id !== sagId) {
    throw new Error("Aktiv timer er på en anden sag");
  }
  const now = new Date().toISOString();
  await db.run(
    "UPDATE time_sessions SET ended_at = ?, updated_at = ? WHERE id = ?",
    [now, now, active.id],
  );
  return { ...active, ended_at: now, updated_at: now };
}

export async function closeSag(
  db: Db,
  userId: string,
  sagId: string,
): Promise<SagTimeSummary> {
  const now = new Date().toISOString();
  // Stop if this user is running on this sag
  const active = await getActiveSession(db, userId);
  if (active && active.sag_id === sagId) {
    await db.run(
      "UPDATE time_sessions SET ended_at = ?, updated_at = ? WHERE id = ?",
      [now, now, active.id],
    );
  }
  // Also stop any other users' running sessions on this sag? Spec: close the case.
  const others = await db.all<TimeSession>(
    "SELECT * FROM time_sessions WHERE sag_id = ? AND ended_at IS NULL",
    [sagId],
  );
  for (const s of others) {
    await db.run(
      "UPDATE time_sessions SET ended_at = ?, updated_at = ? WHERE id = ?",
      [now, now, s.id],
    );
  }

  const existing = await getSagState(db, sagId);
  if (existing) {
    await db.run(
      "UPDATE field_sag_state SET status = 'closed', closed_at = ?, closed_by = ?, updated_at = ? WHERE sag_id = ?",
      [now, userId, now, sagId],
    );
  } else {
    await db.run(
      `INSERT INTO field_sag_state (sag_id, status, closed_at, closed_by, updated_at)
       VALUES (?, 'closed', ?, ?, ?)`,
      [sagId, now, userId, now],
    );
  }
  return summarizeSag(db, sagId, userId);
}

export async function updateSessionTimes(
  db: Db,
  sessionId: string,
  userId: string,
  patch: { started_at?: string; ended_at?: string | null },
): Promise<TimeSession> {
  const row = await db.get<TimeSession>("SELECT * FROM time_sessions WHERE id = ?", [
    sessionId,
  ]);
  if (!row) throw new Error("Session findes ikke");
  if (row.user_id !== userId) throw new Error("Ingen adgang");

  const started_at = patch.started_at ?? row.started_at;
  const ended_at: string | null =
    patch.ended_at === undefined ? row.ended_at : patch.ended_at;

  if (Number.isNaN(Date.parse(started_at))) {
    throw new Error("Ugyldig starttid");
  }
  if (ended_at != null && Number.isNaN(Date.parse(ended_at))) {
    throw new Error("Ugyldig sluttid");
  }
  if (ended_at != null && Date.parse(ended_at) < Date.parse(started_at)) {
    throw new Error("Sluttid skal være efter starttid");
  }

  // If clearing ended_at (re-open running), ensure no other active for user
  if (ended_at == null) {
    if (await isSagClosed(db, row.sag_id)) {
      throw new Error("Sagen er afsluttet");
    }
    await stopActiveForUser(db, userId);
  }

  const now = new Date().toISOString();
  await db.run(
    "UPDATE time_sessions SET started_at = ?, ended_at = ?, updated_at = ? WHERE id = ?",
    [started_at, ended_at, now, sessionId],
  );
  return {
    ...row,
    started_at,
    ended_at,
    updated_at: now,
  };
}

export async function overviewForUser(db: Db, userId: string) {
  const active = (await getActiveSession(db, userId)) || null;
  const closedRows = await db.all<FieldSagState>(
    "SELECT * FROM field_sag_state WHERE status = 'closed'",
  );
  const closedIds = closedRows.map((r) => r.sag_id);
  let activeSummary: SagTimeSummary | null = null;
  if (active) {
    activeSummary = await summarizeSag(db, active.sag_id, userId);
  }
  return { active, activeSummary, closedIds };
}

export async function reopenSag(
  db: Db,
  userId: string,
  sagId: string,
): Promise<SagTimeSummary> {
  const now = new Date().toISOString();
  const existing = await getSagState(db, sagId);
  if (existing) {
    await db.run(
      "UPDATE field_sag_state SET status = 'open', closed_at = NULL, closed_by = NULL, updated_at = ? WHERE sag_id = ?",
      [now, sagId],
    );
  } else {
    await db.run(
      `INSERT INTO field_sag_state (sag_id, status, closed_at, closed_by, updated_at)
       VALUES (?, 'open', NULL, NULL, ?)`,
      [sagId, now],
    );
  }
  return summarizeSag(db, sagId, userId);
}

