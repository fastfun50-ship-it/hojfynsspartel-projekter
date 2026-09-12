/** Room dimensions + wall area helpers (Danish UI). */

export type RoomRow = {
  id: string;
  project_id: string;
  name: string;
  length_m: number | null;
  width_m: number | null;
  height_m: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

/** Wall area: (L+B)×2×H */
export function wallAreaM2(
  lengthM: number | null | undefined,
  widthM: number | null | undefined,
  heightM: number | null | undefined,
): number | null {
  const L = Number(lengthM);
  const B = Number(widthM);
  const H = Number(heightM);
  if (![L, B, H].every((n) => Number.isFinite(n) && n > 0)) return null;
  return (L + B) * 2 * H;
}

export function formatDkNumber(n: number, digits = 1): string {
  return n.toFixed(digits).replace(".", ",");
}

export function formatDkM2(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${formatDkNumber(n)} m²`;
}

export function parseDkNumber(raw: string): number | null {
  const t = String(raw || "").trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function sumRoomAreas(rooms: RoomRow[]): number {
  let sum = 0;
  for (const r of rooms) {
    const a = wallAreaM2(r.length_m, r.width_m, r.height_m);
    if (a != null) sum += a;
  }
  return sum;
}
