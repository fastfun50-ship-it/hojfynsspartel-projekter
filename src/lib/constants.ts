export const FIRMA_ID = "hojfynsspartel";
export const FIRMA_NAME = "Højfynsspartel";
export const SESSION_COOKIE = "hfs_session";
export const DEFAULT_PROJECT_TITLE = "Test facade / spartel";

export const STATUSES = [
  "kladde",
  "afventer_godkendelse",
  "godkendt",
  "publiceret",
  "skjult",
] as const;

export const STATUS_LABELS: Record<string, string> = {
  kladde: "Kladde",
  afventer_godkendelse: "Afventer godkendelse",
  godkendt: "Godkendt",
  publiceret: "Publiceret",
  skjult: "Skjult",
};

export const CATEGORIES = [
  "facade",
  "loft",
  "vaeg",
  "badevaerelse",
  "andet",
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  facade: "Facade",
  loft: "Loft",
  vaeg: "Væg",
  badevaerelse: "Badeværelse",
  andet: "Andet",
};

export const IMAGE_TYPES = ["foer", "under", "efter"] as const;

export const IMAGE_TYPE_LABELS: Record<string, string> = {
  foer: "Før",
  under: "Under",
  efter: "Efter",
};

export const MAX_IMAGE_EDGE = 2000;

export function hasRole(roles: string[], role: "mester" | "admin"): boolean {
  return roles.includes(role) || roles.includes("both");
}
