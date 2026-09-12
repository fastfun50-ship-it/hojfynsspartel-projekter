"use client";

/**
 * Foto tab — wraps existing CameraCapture as-is (HARD STOP: no cam pipeline edits).
 * ECC after save only.
 */
import { useEffect, useMemo, useState } from "react";
import CameraCapture from "@/components/CameraCapture";
import { api } from "@/lib/client";
import { alignAfterToBefore } from "@/lib/eccAlign";
import type { RoomRow } from "@/lib/rooms";
import type { ImageType, ProjectImage } from "@/lib/types";

type Img = ProjectImage & {
  url: string;
  alignedUrl?: string | null;
  sliderUrl?: string;
};

type Props = {
  jobId: string | null;
  rooms: RoomRow[];
  activeRoomId: string | null;
  onActiveRoom: (id: string) => void;
  onNeedJob: () => void;
  onNeedRoom: () => void;
};

export default function FotoPage({
  jobId,
  rooms,
  activeRoomId,
  onActiveRoom,
  onNeedJob,
  onNeedRoom,
}: Props) {
  const room = rooms.find((r) => r.id === activeRoomId) || rooms[0] || null;
  const [images, setImages] = useState<Img[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [shotType, setShotType] = useState<ImageType>("foer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [alignHint, setAlignHint] = useState("");

  useEffect(() => {
    if (!jobId) {
      setImages([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await api<{ images: Img[] }>(
          `/api/projects/${jobId}/images`,
        );
        if (!cancelled) setImages(data.images || []);
      } catch {
        if (!cancelled) setImages([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const roomImages = useMemo(() => {
    if (!room) return images.filter((i) => !i.room_id);
    const tagged = images.filter((i) => i.room_id === room.id);
    if (tagged.length) return tagged;
    // Legacy untagged images only when single-room job
    if (rooms.length <= 1) return images.filter((i) => !i.room_id);
    return tagged;
  }, [images, room, rooms.length]);

  const foer = useMemo(
    () => [...roomImages].filter((i) => i.type === "foer").at(-1),
    [roomImages],
  );
  const efter = useMemo(
    () => [...roomImages].filter((i) => i.type === "efter").at(-1),
    [roomImages],
  );
  const foerUrl = foer?.url || null;
  const efterUrl =
    efter?.sliderUrl || efter?.alignedUrl || efter?.url || null;

  function openCapture(type: ImageType) {
    if (!jobId) {
      onNeedJob();
      return;
    }
    if (!room) {
      onNeedRoom();
      return;
    }
    setShotType(type);
    setCameraOpen(true);
  }

  async function onCapture(file: File) {
    setCameraOpen(false);
    if (!jobId || !room) return;
    setBusy(true);
    setError("");
    setAlignHint("");
    try {
      const fd = new FormData();
      fd.append("type", shotType);
      fd.append("file", file);
      fd.append("room_id", room.id);
      if (shotType === "efter" && foerUrl) {
        const aligned = await alignAfterToBefore(foerUrl, file);
        fd.append("aligned", aligned.alignedFile);
        if (!aligned.ok && aligned.message) setAlignHint(aligned.message);
      }
      const data = await api<{ images: Img[] }>(
        `/api/projects/${jobId}/images`,
        { method: "POST", body: fd },
      );
      setImages(data.images);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload fejlede");
    } finally {
      setBusy(false);
    }
  }

  if (!jobId) {
    return (
      <div className="field-scroll">
        <header className="field-header">
          <h1 className="field-brand">Foto</h1>
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

  if (!room) {
    return (
      <div className="field-scroll">
        <header className="field-header">
          <h1 className="field-brand">Foto</h1>
          <p className="field-sub">Vælg rum først</p>
        </header>
        <button
          type="button"
          className="btn-field btn-field-primary no-swipe"
          onClick={onNeedRoom}
        >
          Gå til Rum
        </button>
      </div>
    );
  }

  const pillLabel = `${room.name} · ${shotType === "efter" ? "Efter-foto" : "Før-foto"}`;

  return (
    <div className="field-scroll foto-scroll">
      <header className="foto-header">
        <div className="foto-room-pill" aria-label={pillLabel}>
          {pillLabel}
        </div>
      </header>

      {rooms.length > 1 ? (
        <div className="rum-pills foto-room-picker">
          {rooms.map((r) => (
            <button
              key={r.id}
              type="button"
              className={
                "rum-pill no-swipe" +
                (r.id === room.id ? " rum-pill-active" : "")
              }
              onClick={() => onActiveRoom(r.id)}
            >
              {r.name}
            </button>
          ))}
        </div>
      ) : null}

      {error ? <div className="error">{error}</div> : null}
      {alignHint ? <p className="hint align-soft-warn">{alignHint}</p> : null}

      <div className="foto-preview-grid">
        <button
          type="button"
          className="foto-slot no-swipe"
          onClick={() => openCapture("foer")}
          disabled={busy}
        >
          <span className="foto-slot-label">Før</span>
          {foerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={foerUrl} alt="Før" />
          ) : (
            <span className="foto-slot-empty">Tag før-foto</span>
          )}
        </button>
        <button
          type="button"
          className="foto-slot no-swipe"
          onClick={() => openCapture("efter")}
          disabled={busy || !foerUrl}
        >
          <span className="foto-slot-label">Efter</span>
          {efterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={efterUrl} alt="Efter" />
          ) : (
            <span className="foto-slot-empty">
              {foerUrl ? "Tag efter-foto" : "Før først"}
            </span>
          )}
        </button>
      </div>

      <div className="field-primary-slot foto-actions">
        <button
          type="button"
          className="btn-field btn-field-primary no-swipe"
          disabled={busy}
          onClick={() => openCapture(foerUrl ? "efter" : "foer")}
        >
          {busy ? "Gemmer…" : foerUrl ? "Tag efter-foto" : "Tag før-foto"}
        </button>
      </div>

      {/* Existing CameraCapture only — no getUserMedia changes */}
      <CameraCapture
        open={cameraOpen}
        title={shotType === "efter" ? "Efter" : "Før"}
        overlayUrl={shotType === "efter" ? foerUrl : null}
        onCapture={onCapture}
        onClose={() => setCameraOpen(false)}
      />
    </div>
  );
}
