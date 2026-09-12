"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  type FieldTabId,
  type FieldViewId,
} from "@/lib/fieldDemo";
import { api } from "@/lib/client";
import { sumRoomAreas, type RoomRow } from "@/lib/rooms";
import JobPage, { type JobListItem } from "./JobPage";
import RumPage from "./RumPage";
import FotoPage from "./FotoPage";
import MaterialerPage from "./MaterialerPage";
import ResultatPage from "./ResultatPage";
import MerePage from "./MerePage";
import FieldTabBar from "./FieldTabBar";


type Props = {
  isAdmin: boolean;
  logoutAction: () => Promise<void>;
  initialJobs: JobListItem[];
};

const LS_JOB = "hfs.activeJobId";
const LS_ROOM = "hfs.activeRoomId";

function viewFromParam(raw: string | null): FieldViewId {
  if (
    raw === "job" ||
    raw === "rum" ||
    raw === "materialer" ||
    raw === "resultat" ||
    raw === "mere" ||
    raw === "foto"
  ) {
    return raw;
  }
  // legacy redirects
  if (raw === "idag" || raw === "uge" || raw === "sager") return "job";
  return "job";
}

export default function FieldShell({
  isAdmin,
  logoutAction,
  initialJobs,
}: Props) {
  const router = useRouter();
  const search = useSearchParams();
  const [tab, setTab] = useState<FieldViewId>(viewFromParam(search.get("tab")));
  const [jobs, setJobs] = useState<JobListItem[]>(initialJobs);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);
  const swipeLocked = useRef(false);
  const roomsRef = useRef(rooms);
  const activeRoomRef = useRef(activeRoomId);
  roomsRef.current = rooms;
  activeRoomRef.current = activeRoomId;

  useEffect(() => {
    setJobs(initialJobs);
  }, [initialJobs]);

  useEffect(() => {
    const t = viewFromParam(search.get("tab"));
    setTab(t);
    const jobQ = search.get("job");
    if (jobQ) setActiveJobId(jobQ);
  }, [search]);

  useEffect(() => {
    try {
      const j = localStorage.getItem(LS_JOB);
      const r = localStorage.getItem(LS_ROOM);
      if (j) setActiveJobId((cur) => cur || j);
      if (r) setActiveRoomId((cur) => cur || r);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      if (activeJobId) localStorage.setItem(LS_JOB, activeJobId);
      else localStorage.removeItem(LS_JOB);
    } catch {
      /* ignore */
    }
  }, [activeJobId]);

  useEffect(() => {
    try {
      if (activeRoomId) localStorage.setItem(LS_ROOM, activeRoomId);
      else localStorage.removeItem(LS_ROOM);
    } catch {
      /* ignore */
    }
  }, [activeRoomId]);

  const loadRooms = useCallback(async (jobId: string) => {
    try {
      const data = await api<{ rooms: RoomRow[] }>(
        `/api/projects/${jobId}/rooms`,
      );
      setRooms(data.rooms || []);
      setActiveRoomId((cur) => {
        if (cur && data.rooms.some((r) => r.id === cur)) return cur;
        return data.rooms[0]?.id || null;
      });
      const kvm = sumRoomAreas(data.rooms || []);
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? {
                ...j,
                roomCount: data.rooms.length,
                totalKvm: kvm || null,
              }
            : j,
        ),
      );
    } catch {
      setRooms([]);
    }
  }, []);

  useEffect(() => {
    if (!activeJobId) {
      setRooms([]);
      return;
    }
    void loadRooms(activeJobId);
  }, [activeJobId, loadRooms]);

  const activeJob = jobs.find((j) => j.id === activeJobId) || null;
  const jobName =
    activeJob?.customerName ||
    activeJob?.title ||
    "Job";

  function goView(id: FieldViewId) {
    setTab(id);
    const q = new URLSearchParams();
    q.set("tab", id);
    if (activeJobId) q.set("job", activeJobId);
    router.replace("/app?" + q.toString(), { scroll: false });
  }

  function goTab(id: FieldTabId) {
    goView(id);
  }

  function selectJob(id: string) {
    setActiveJobId(id);
    setTab("rum");
    const q = new URLSearchParams({ tab: "rum", job: id });
    router.replace("/app?" + q.toString(), { scroll: false });
  }

  function onCreated(job: JobListItem) {
    setJobs((prev) => [job, ...prev.filter((j) => j.id !== job.id)]);
    selectJob(job.id);
  }

  function onRoomsChange(next: RoomRow[]) {
    setRooms(next);
    if (activeJobId) {
      const kvm = sumRoomAreas(next);
      setJobs((prev) =>
        prev.map((j) =>
          j.id === activeJobId
            ? { ...j, roomCount: next.length, totalKvm: kvm || null }
            : j,
        ),
      );
    }
  }

  /** Swipe = next/prev room â€” NEVER changes job or tab. */
  function onSwipePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (tab !== "rum" && tab !== "foto" && tab !== "resultat") return;
    if (rooms.length < 2) return;
    const left = e.currentTarget.getBoundingClientRect().left;
    if (e.clientX - left < 20) return;
    swipeStartX.current = e.clientX;
    swipeStartY.current = e.clientY;
    swipeLocked.current = false;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function onSwipePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const sx = swipeStartX.current;
    const sy = swipeStartY.current;
    if (sx == null || sy == null) return;
    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    if (!swipeLocked.current) {
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.1) {
        swipeStartX.current = null;
        return;
      }
      swipeLocked.current = true;
    }
    if (e.cancelable) e.preventDefault();
  }

  function finishRoomSwipe(dx: number) {
    const list = roomsRef.current;
    const cur = activeRoomRef.current;
    if (list.length < 2 || !cur) return;
    const idx = list.findIndex((r) => r.id === cur);
    if (idx < 0) return;
    if (dx < -40 && idx < list.length - 1) setActiveRoomId(list[idx + 1].id);
    else if (dx > 40 && idx > 0) setActiveRoomId(list[idx - 1].id);
  }

  function onSwipePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const sx = swipeStartX.current;
    const locked = swipeLocked.current;
    swipeStartX.current = null;
    swipeStartY.current = null;
    swipeLocked.current = false;
    if (!locked || sx == null) return;
    finishRoomSwipe(e.clientX - sx);
  }

  const navActive: FieldTabId | null =
    tab === "foto" ? "rum" : tab === "materialer" || tab === "job" || tab === "rum" || tab === "resultat" || tab === "mere" ? tab : null;

  return (
    <div className="field-root">
      <div className="field-main">
        {tab === "job" ? (
          <JobPage
            jobs={jobs}
            activeJobId={activeJobId}
            onSelectJob={selectJob}
            onCreated={onCreated}
            onRefresh={() => router.refresh()}
          />
        ) : null}
        {tab === "rum" ? (
          <RumPage
            jobId={activeJobId}
            jobName={jobName}
            rooms={rooms}
            activeRoomId={activeRoomId}
            onRoomsChange={onRoomsChange}
            onActiveRoom={setActiveRoomId}
            onNeedJob={() => goTab("job")}
            onOpenFoto={() => goView("foto")}
          />
        ) : null}
        {tab === "foto" ? (
          <FotoPage
            jobId={activeJobId}
            rooms={rooms}
            activeRoomId={activeRoomId}
            onActiveRoom={setActiveRoomId}
            onNeedJob={() => goTab("job")}
            onNeedRoom={() => goTab("rum")}
          />
        ) : null}
        {tab === "materialer" ? (
          <MaterialerPage
            jobId={activeJobId}
            jobName={jobName}
            onNeedJob={() => goTab("job")}
          />
        ) : null}
        {tab === "resultat" ? (
          <ResultatPage
            jobId={activeJobId}
            jobName={jobName}
            rooms={rooms}
            activeRoomId={activeRoomId}
            onActiveRoom={setActiveRoomId}
            onNeedJob={() => goTab("job")}
          />
        ) : null}
        {tab === "mere" ? (
          <MerePage
            isAdmin={isAdmin}
            logoutAction={logoutAction}
            activeJob={activeJob}
          />
        ) : null}
      </div>

      <div
        className="field-swipe-zone"
        role="presentation"
        aria-hidden
        onPointerDown={onSwipePointerDown}
        onPointerMove={onSwipePointerMove}
        onPointerUp={onSwipePointerUp}
        onPointerCancel={() => {
          swipeStartX.current = null;
          swipeLocked.current = false;
        }}
      />

      <FieldTabBar active={navActive} onSelect={goTab} />
    </div>
  );
}

