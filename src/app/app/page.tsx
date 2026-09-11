import { Suspense } from "react";
import { getSession } from "@/lib/session";
import { hasRole, CATEGORY_LABELS, STATUS_LABELS } from "@/lib/constants";
import { listProjectsForFirm } from "@/lib/projects";
import { logoutAction } from "./actions";
import FieldShell from "@/components/field/FieldShell";

export const dynamic = "force-dynamic";

export default async function AppHomePage() {
  const session = await getSession();
  const isAdmin = session.user ? hasRole(session.user.roles, "admin") : false;
  const projects = await listProjectsForFirm();
  const items = projects.slice(0, 40).map((p) => ({
    id: p.id,
    title: p.title,
    subtitle:
      (CATEGORY_LABELS[p.category] || p.category) +
      " · " +
      (STATUS_LABELS[p.status] || p.status),
  }));

  return (
    <Suspense fallback={<div className="field-scroll hint">Henter…</div>}>
      <FieldShell isAdmin={isAdmin} logoutAction={logoutAction} projects={items} />
    </Suspense>
  );
}
