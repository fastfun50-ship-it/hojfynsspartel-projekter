import { Suspense } from "react";
import { getSession } from "@/lib/session";
import { hasRole } from "@/lib/constants";
import { listProjectsForFirm, listRoomsForProject } from "@/lib/projects";
import { sumRoomAreas } from "@/lib/rooms";
import { logoutAction } from "./actions";
import FieldShell from "@/components/field/FieldShell";
import { mapProjectsToJobs } from "@/lib/mapProjectsToJobs";

export const dynamic = "force-dynamic";

export default async function AppHomePage() {
  const session = await getSession();
  const isAdmin = session.user ? hasRole(session.user.roles, "admin") : false;
  const projects = await listProjectsForFirm();
  const withRooms = await Promise.all(
    projects.slice(0, 40).map(async (p) => {
      try {
        const rooms = await listRoomsForProject(p.id);
        return {
          ...p,
          roomCount: rooms.length,
          totalKvm: sumRoomAreas(rooms) || null,
        };
      } catch {
        return { ...p, roomCount: 0, totalKvm: null };
      }
    }),
  );
  const initialJobs = mapProjectsToJobs(withRooms);

  return (
    <Suspense fallback={<div className="field-scroll hint">Henter…</div>}>
      <FieldShell
        isAdmin={isAdmin}
        logoutAction={logoutAction}
        initialJobs={initialJobs}
      />
    </Suspense>
  );
}
