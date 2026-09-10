export type LastActionKind = "submit" | "publish" | "hide" | "reject";

export type LastAction = {
  kind: LastActionKind;
  projectId: string;
  at: number;
};

export const UNDO_TTL_MS = 10 * 60 * 1000;
export const LAST_ACTION_EVENT = "hfs:last-action";
const STORAGE_KEY = "hfs_last_action";

export function saveLastAction(kind: LastActionKind, projectId: string): void {
  if (typeof window === "undefined") return;
  const action: LastAction = { kind, projectId, at: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(action));
  window.dispatchEvent(new Event(LAST_ACTION_EVENT));
}

export function clearLastAction(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(LAST_ACTION_EVENT));
}

export function readLastAction(): LastAction | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const action = JSON.parse(raw) as LastAction;
    if (!action?.kind || !action.projectId || !action.at) {
      clearLastAction();
      return null;
    }
    if (Date.now() - action.at > UNDO_TTL_MS) {
      clearLastAction();
      return null;
    }
    return action;
  } catch {
    return null;
  }
}

export function undoLabel(kind: LastActionKind): string {
  switch (kind) {
    case "publish":
      return "Publiceret.";
    case "submit":
      return "Sendt.";
    case "hide":
      return "Skjult.";
    case "reject":
      return "Afvist.";
  }
}
