/** Active field tabs + minimal fallback for SagView demo id. */

export const DEMO_NEXT = {
  id: "demo-birkevej",
  titleShort: "Birkevej 12",
} as const;

export const FIELD_TABS = [
  { id: "job", label: "Job" },
  { id: "rum", label: "Rum" },
  { id: "foto", label: "Foto" },
  { id: "resultat", label: "Resultat" },
  { id: "mere", label: "Mere" },
] as const;

export type FieldTabId = (typeof FIELD_TABS)[number]["id"];
