/** Demo field data matching Peter mocks (I dag / Uge / Sag). */

export type FieldJob = {
  id: string;
  label: "NÆSTE" | "SENERE" | "I MORGEN";
  address: string;
  city: string;
  titleShort: string;
  service: string;
  detail: string;
  slot: string;
  phone: string;
  contact: string;
  dayKey: "tir" | "ons" | "tor" | "fre";
};

export const DEMO_NEXT: FieldJob = {
  id: "demo-birkevej",
  label: "NÆSTE",
  address: "Birkevej 12",
  city: "Odense SV",
  titleShort: "Birkevej 12",
  service: "Fuldspartel",
  detail: "garage",
  slot: "8–12",
  phone: "+4512345678",
  contact: "Michael",
  dayKey: "tir",
};

export const DEMO_REST: { id: string; line: string }[] = [
  { id: "demo-svendborg", line: "12.30 · Svendborg · maling" },
  { id: "demo-vissenbjerg", line: "I morgen · Vissenbjerg · kig" },
];

export const DEMO_WEEK_DAYS = [
  { key: "tir" as const, label: "Tir" },
  { key: "ons" as const, label: "Ons" },
  { key: "tor" as const, label: "Tor" },
  { key: "fre" as const, label: "Fre" },
];

export type WeekSlot =
  | {
      kind: "job";
      slot: string;
      city: string;
      service: string;
      contact: string;
      jobId: string;
    }
  | { kind: "ledig"; slot: string };

export const DEMO_WEEK: Record<string, WeekSlot[]> = {
  tir: [
    {
      kind: "job",
      slot: "8–12",
      city: "Odense SV",
      service: "fuldspartel",
      contact: "Michael",
      jobId: "demo-birkevej",
    },
    { kind: "ledig", slot: "12.30–15" },
  ],
  ons: [
    { kind: "ledig", slot: "8–12" },
    { kind: "ledig", slot: "12.30–15" },
  ],
  tor: [
    { kind: "ledig", slot: "8–12" },
    { kind: "ledig", slot: "12.30–15" },
  ],
  fre: [
    { kind: "ledig", slot: "8–12" },
    { kind: "ledig", slot: "12.30–15" },
  ],
};

export const FIELD_TABS = [
  { id: "job", label: "Job" },
  { id: "rum", label: "Rum" },
  { id: "foto", label: "Foto" },
  { id: "resultat", label: "Resultat" },
  { id: "mere", label: "Mere" },
] as const;

export type FieldTabId = (typeof FIELD_TABS)[number]["id"];

export function formatIDagSubtitle(d = new Date()): string {
  const days = ["søn", "man", "tir", "ons", "tor", "fre", "lør"];
  const months = [
    "jan",
    "feb",
    "mar",
    "apr",
    "maj",
    "jun",
    "jul",
    "aug",
    "sep",
    "okt",
    "nov",
    "dec",
  ];
  return `I dag · ${days[d.getDay()]} ${d.getDate()}. ${months[d.getMonth()]}`;
}

export function isoWeek(d = new Date()): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
