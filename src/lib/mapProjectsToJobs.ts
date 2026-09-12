import { inferFieldStatus, type FieldStatus } from "./fieldStatus";

export type MappedJobItem = {
  id: string;
  title: string;
  customerName: string;
  city: string;
  fieldStatus: FieldStatus;
  roomCount: number;
  totalKvm: number | null;
  updatedAt: string;
  phone?: string | null;
};

/** Server-safe mapper (must NOT live in a "use client" module). */
export function mapProjectsToJobs(
  projects: Array<{
    id: string;
    title: string;
    status: string;
    field_status?: string | null;
    customer_name?: string | null;
    city?: string | null;
    phone?: string | null;
    note?: string | null;
    updated_at: string;
    roomCount?: number;
    totalKvm?: number | null;
  }>,
): MappedJobItem[] {
  return projects.map((p) => {
    let customer = p.customer_name || "";
    let city = p.city || "";
    if (!customer && p.note) {
      const m = p.note.match(/Navn:\s*(.+)/);
      if (m) customer = m[1].trim();
    }
    if (!city && p.note) {
      const m = p.note.match(/By:\s*(.+)/);
      if (m) city = m[1].trim();
    }
    return {
      id: p.id,
      title: p.title,
      customerName: customer || p.title,
      city,
      fieldStatus: inferFieldStatus(p.field_status, p.status),
      roomCount: p.roomCount ?? 0,
      totalKvm: p.totalKvm ?? null,
      updatedAt: p.updated_at,
      phone: p.phone ?? null,
    };
  });
}
