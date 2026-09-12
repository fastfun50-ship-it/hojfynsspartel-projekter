"use client";

import { useEffect, useMemo, useState } from "react";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import { api } from "@/lib/client";
import {
  formatDkM2,
  sumRoomAreas,
  wallAreaM2,
  type RoomRow,
} from "@/lib/rooms";
import type { ProjectImage } from "@/lib/types";

type Img = ProjectImage & {
  url: string;
  alignedUrl?: string | null;
  sliderUrl?: string;
};

type Props = {
  jobId: string | null;
  jobName: string;
  rooms: RoomRow[];
  activeRoomId: string | null;
  onActiveRoom: (id: string) => void;
  onNeedJob: () => void;
};

export default function ResultatPage({
  jobId,
  jobName,
  rooms,
  activeRoomId,
  onActiveRoom,
  onNeedJob,
}: Props) {
  const [images, setImages] = useState<Img[]>([]);
  const [shareNote, setShareNote] = useState("");

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

  const total = useMemo(() => sumRoomAreas(rooms), [rooms]);
  const room =
    rooms.find((r) => r.id === activeRoomId) || rooms[0] || null;

  const pair = useMemo(() => {
    const pool = room
      ? images.filter((i) => i.room_id === room.id).length
        ? images.filter((i) => i.room_id === room.id)
        : rooms.length <= 1
          ? images.filter((i) => !i.room_id)
          : []
      : images;
    const foer = [...pool].filter((i) => i.type === "foer").at(-1);
    const efter = [...pool].filter((i) => i.type === "efter").at(-1);
    return {
      before: foer?.url || null,
      after:
        efter?.sliderUrl || efter?.alignedUrl || efter?.url || null,
    };
  }, [images, room, rooms.length]);

  async function onShare() {
    setShareNote("");
    const text = `${jobName}\nI alt ${formatDkM2(total)}`;
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/projekter`
        : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: jobName, text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setShareNote("Kopieret til udklipsholder");
    } catch {
      setShareNote("Deling afbrudt");
    }
  }

  if (!jobId) {
    return (
      <div className="field-scroll">
        <header className="field-header">
          <h1 className="field-brand">Resultat</h1>
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
    <div className="field-scroll resultat-scroll">
      <header className="resultat-header">
        <h1 className="resultat-title">Resultat</h1>
        <p className="resultat-job">{jobName}</p>
      </header>

      <p className="resultat-total">{formatDkM2(total)}</p>

      {pair.before && pair.after ? (
        <div className="resultat-slider">
          <BeforeAfterSlider beforeUrl={pair.before} afterUrl={pair.after} />
        </div>
      ) : (
        <p className="hint resultat-no-ba">
          Tag før- og efter-foto for slider
        </p>
      )}

      {rooms.length > 1 ? (
        <div className="rum-pills">
          {rooms.map((r) => (
            <button
              key={r.id}
              type="button"
              className={
                "rum-pill no-swipe" +
                (room?.id === r.id ? " rum-pill-active" : "")
              }
              onClick={() => onActiveRoom(r.id)}
            >
              {r.name}
            </button>
          ))}
        </div>
      ) : null}

      <section className="resultat-fordeling">
        <h2 className="resultat-fordeling-title">Fordeling pr. rum</h2>
        <ul className="resultat-room-list">
          {rooms.length === 0 ? (
            <li className="hint">Ingen rum endnu</li>
          ) : (
            rooms.map((r) => {
              const a = wallAreaM2(r.length_m, r.width_m, r.height_m);
              return (
                <li key={r.id} className="resultat-room-row">
                  <span>{r.name}</span>
                  <strong>{formatDkM2(a)}</strong>
                </li>
              );
            })
          )}
          <li className="resultat-room-row resultat-room-total">
            <span>I alt</span>
            <strong>{formatDkM2(total)}</strong>
          </li>
        </ul>
      </section>

      {shareNote ? <p className="hint">{shareNote}</p> : null}

      <div className="field-primary-slot">
        <button
          type="button"
          className="btn-field btn-field-primary no-swipe"
          onClick={() => void onShare()}
        >
          Vis kunden / Del
        </button>
      </div>
    </div>
  );
}
