export type TimeSession = {
  id: string;
  sag_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FieldSagState = {
  sag_id: string;
  status: "open" | "closed";
  closed_at: string | null;
  closed_by: string | null;
  updated_at: string;
};

export type SagTimeSummary = {
  sagId: string;
  closed: boolean;
  closedAt: string | null;
  totalMs: number;
  todayMs: number;
  active: TimeSession | null;
  sessions: TimeSession[];
};
