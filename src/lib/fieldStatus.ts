export const FIELD_STATUSES = [
  "mode_booket",
  "opmaalt",
  "i_gang",
  "faerdig",
] as const;

export type FieldStatus = (typeof FIELD_STATUSES)[number];

export const FIELD_STATUS_LABELS: Record<FieldStatus, string> = {
  mode_booket: "Møde booket",
  opmaalt: "Opmålt",
  i_gang: "I gang",
  faerdig: "Færdig",
};

/** Map CMS project.status → sensible field status when field_status empty. */
export function inferFieldStatus(
  fieldStatus: string | null | undefined,
  projectStatus: string | null | undefined,
): FieldStatus {
  if (
    fieldStatus === "mode_booket" ||
    fieldStatus === "opmaalt" ||
    fieldStatus === "i_gang" ||
    fieldStatus === "faerdig"
  ) {
    return fieldStatus;
  }
  if (projectStatus === "publiceret" || projectStatus === "godkendt") return "faerdig";
  if (projectStatus === "afventer_godkendelse") return "i_gang";
  return "mode_booket";
}
