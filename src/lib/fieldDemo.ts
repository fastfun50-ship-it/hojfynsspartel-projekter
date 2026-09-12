/** Active field tabs + minimal fallback for SagView demo id. */

export const DEMO_NEXT = {
  id: "demo-birkevej",
  titleShort: "Birkevej 12",
} as const;

export const FIELD_TABS = [
  { id: "job", label: "Job" },
  { id: "rum", label: "Rum" },
  { id: "materialer", label: "Materialer" },
  { id: "resultat", label: "Resultat" },
  { id: "mere", label: "Mere" },
] as const;

export type FieldTabId = (typeof FIELD_TABS)[number]["id"];

/** Bottom-nav tabs + internal foto view (opened from Rum camera entry). */
export type FieldViewId = FieldTabId | "foto";
