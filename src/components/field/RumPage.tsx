"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import {
  formatDkM2,
  formatDkNumber,
  parseDkNumber,
  wallAreaM2,
  type RoomRow,
} from "@/lib/rooms";
import { IconCam } from "./FieldIcons";

type Props = {
  jobId: string | null;
  jobName: string;
  rooms: RoomRow[];
  activeRoomId: string | null;
  onRoomsChange: (rooms: RoomRow[]) => void;
  onActiveRoom: (id: string) => void;
  onNeedJob: () => void;
  /** Opens existing FotoPage / CameraCapture flow for active room. */
  onOpenFoto: () => void;
};

function DimField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="rum-dim-card">
      <span className="rum-dim-label">{label}</span>
      <span className="rum-dim-row">
        <input
          className="rum-dim-input no-swipe"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(".", ","))}
          placeholder="0,00"
        />
        <span className="rum-dim-unit">m</span>
      </span>
    </label>
  );
}

export default function RumPage({
  jobId,
  jobName,
  rooms,
  activeRoomId,
  onRoomsChange,
  onActiveRoom,
  onNeedJob,
  onOpenFoto,
}: Props) {
  const room =
    rooms.find((r) => r.id === activeRoomId) || rooms[0] || null;

  const [name, setName] = useState(room?.name || "Stue");
  const [L, setL] = useState(
    room?.length_m != null ? formatDkNumber(room.length_m, 2) : "",
  );
  const [B, setB] = useState(
    room?.width_m != null ? formatDkNumber(room.width_m, 2) : "",
  );
  const [H, setH] = useState(
    room?.height_m != null ? formatDkNumber(room.height_m, 2) : "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (!room) {
      setName(`Rum ${(rooms.length || 0) + 1}`);
      setL("");
      setB("");
      setH("");
      return;
    }
    setName(room.name);
    setL(room.length_m != null ? formatDkNumber(room.length_m, 2) : "");
    setB(room.width_m != null ? formatDkNumber(room.width_m, 2) : "");
    setH(room.height_m != null ? formatDkNumber(room.height_m, 2) : "");
  }, [room?.id, room?.name, room?.length_m, room?.width_m, room?.height_m, rooms.length]);

  const liveArea = useMemo(
    () => wallAreaM2(parseDkNumber(L), parseDkNumber(B), parseDkNumber(H)),
    [L, B, H],
  );

  const totalKvm = useMemo(() => {
    let s = 0;
    for (const r of rooms) {
      const a =
        room && r.id === room.id
          ? liveArea
          : wallAreaM2(r.length_m, r.width_m, r.height_m);
      if (a != null) s += a;
    }
    if (!room && liveArea != null) s += liveArea;
    return s;
  }, [rooms, room, liveArea]);

  async function saveRoom() {
    if (!jobId) {
      onNeedJob();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const payload = {
        name: name.trim() || "Rum",
        length_m: parseDkNumber(L),
        width_m: parseDkNumber(B),
        height_m: parseDkNumber(H),
      };
      if (room) {
        const data = await api<{ rooms: RoomRow[] }>(
          `/api/projects/${jobId}/rooms/${room.id}`,
          { method: "PATCH", body: JSON.stringify(payload) },
        );
        onRoomsChange(data.rooms);
      } else {
        const data = await api<{ room: RoomRow; rooms: RoomRow[] }>(
          `/api/projects/${jobId}/rooms`,
          { method: "POST", body: JSON.stringify(payload) },
        );
        onRoomsChange(data.rooms);
        if (data.room) onActiveRoom(data.room.id);
      }
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke gemme");
    } finally {
      setBusy(false);
    }
  }

  async function addRoom() {
    if (!jobId) {
      onNeedJob();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await api<{ room: RoomRow; rooms: RoomRow[] }>(
        `/api/projects/${jobId}/rooms`,
        {
          method: "POST",
          body: JSON.stringify({ name: `Rum ${rooms.length + 1}` }),
        },
      );
      onRoomsChange(data.rooms);
      if (data.room) onActiveRoom(data.room.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke oprette rum");
    } finally {
      setBusy(false);
    }
  }

  if (!jobId) {
    return (
      <div className="field-scroll">
        <header className="field-header">
          <h1 className="field-brand">Rum</h1>
          <p className="field-sub">Vælg job først</p>
        </header>
        <button
          type="button"
          className="btn-field btn-field-primary no-swipe"
          onClick={onNeedJob}
        >
          Gå til Job
        </button>
      </div>
    );
  }

  return (
    <div className="field-scroll rum-scroll">
      <header className="rum-header">
        <div>
          <p className="rum-job-hint">{jobName}</p>
          <h1 className="rum-title">{name || "Rum"}</h1>
          <p className="rum-total-hint">I alt {formatDkM2(totalKvm)}</p>
        </div>
        <button
          type="button"
          className="rum-add no-swipe"
          onClick={() => void addRoom()}
          disabled={busy}
        >
          + Rum
        </button>
      </header>

      <div className="rum-pills-row">
        <div className="rum-pills">
          {rooms.length > 1
            ? rooms.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={
                    "rum-pill no-swipe" +
                    ((room?.id || activeRoomId) === r.id ? " rum-pill-active" : "")
                  }
                  onClick={() => onActiveRoom(r.id)}
                >
                  {r.name}
                </button>
              ))
            : null}
        </div>
        <button
          type="button"
          className="rum-cam-btn no-swipe"
          onClick={onOpenFoto}
          aria-label="Tag foto"
          title="Foto"
        >
          <IconCam size={22} />
        </button>
      </div>

      {error ? <div className="error">{error}</div> : null}

      <div className="rum-dims">
        <label className="rum-name-card">
          <span className="rum-dim-label">Navn</span>
          <input
            className="rum-name-input no-swipe"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <DimField label="Længde" value={L} onChange={setL} />
        <DimField label="Bredde" value={B} onChange={setB} />
        <DimField label="Højde" value={H} onChange={setH} />
      </div>

      <div className="rum-live-box" aria-live="polite">
        (L+B)×2×H = {liveArea != null ? formatDkM2(liveArea) : "—,– m²"}
      </div>

      <p className="hint rum-swipe-hint">Stryg for næste rum</p>

      <div className="field-primary-slot">
        <button
          type="button"
          className="btn-field btn-field-primary no-swipe"
          disabled={busy}
          onClick={() => void saveRoom()}
        >
          {savedFlash ? "Gemt" : "Gem rum"}
        </button>
      </div>
    </div>
  );
}
