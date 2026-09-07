export function adjustPrice(grundpris: number | null | undefined, pct: number): number | null {
  if (grundpris == null || Number.isNaN(Number(grundpris))) return null;
  const adjusted = Number(grundpris) * (1 + Number(pct) / 100);
  return Math.round(adjusted / 1000) * 1000;
}

export function formatKr(amount: number | null | undefined): string {
  if (amount == null) return "";
  return new Intl.NumberFormat("da-DK").format(amount) + " kr";
}

export function priceFromLabel(
  priceFrom: number | null | undefined,
  pct: number,
  show: boolean,
): string | null {
  if (!show) return null;
  const v = adjustPrice(priceFrom, pct);
  if (v == null) return null;
  return "fra " + formatKr(v);
}
