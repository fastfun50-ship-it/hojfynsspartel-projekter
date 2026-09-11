"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CameraCapture from "@/components/CameraCapture";
import { api } from "@/lib/client";
import { DEMO_NEXT } from "@/lib/fieldDemo";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import type { ImageType, ProjectImage } from "@/lib/types";
import { IconCam, IconCheck, IconClock, IconMic, IconWave } from "./FieldIcons";

type Img = ProjectImage & { url: string };

type Props = {
  mode: "demo" | "project";
  projectId?: string;
  title?: string;
  initialImages?: Img[];
  onBack: () => void;
};

function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInputValue(local: string): string {
  const d = new Date(local);
  return d.toISOString();
}

export default function SagView({
  mode,
  projectId,
  title,
  initialImages = [],
  onBack,
}: Props) {
  const router = useRouter();
  const sagId = mode === "project" && projectId ? projectId : DEMO_NEXT.id;
  const heading = title || DEMO_NEXT.titleShort;
  const [images, setImages] = useState<Img[]>(initialImages);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [activeType, setActiveType] = useState<ImageType>("foer");
  const [busyUpload, setBusyUpload] = useState(false);
  const [error, setError] = useState("");
  const [localFoer, setLocalFoer] = useState<string | null>(null);
  const [localEfter, setLocalEfter] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editDrafts, setEditDrafts] = useState<
    Record<string, { started: string; ended: string }>
  >({});

  const {
    busy: busyTime,
    error: timeError,
    start,
    stop,
    close,
    patchSession,
    runningHere,
    closed,
    liveLabel,
    totalMs,
    todayMs,
    summary,
    formatSamletTid,
    formatTotalDuration,
  } = useTimeTracking(sagId);

  useEffect(() => {
    setImages(initialImages);
  }, [initialImages]);

  useEffect(() => {
    if (!summary?.sessions) return;
    const next: Record<string, { started: string; ended: string }> = {};
    for (const s of summary.sessions) {
      next[s.id] = {
        started: toLocalInputValue(s.started_at),
        ended: toLocalInputValue(s.ended_at),
      };
    }
    setEditDrafts(next);
  }, [summary?.sessions]);

  const latestFoer = useMemo(
    () => [...images].filter((i) => i.type === "foer").at(-1),
    [images],
  );
  const latestEfter = useMemo(
    () => [...images].filter((i) => i.type === "efter").at(-1),
    [images],
  );

  const foerUrl = latestFoer?.url || localFoer;
  const efterUrl = latestEfter?.url || localEfter;

  function openCamera(prefer: ImageType) {
    let next: ImageType = prefer;
    if (!foerUrl) next = "foer";
    else if (prefer === "efter" || !efterUrl) next = "efter";
    setActiveType(next);
    setCameraOpen(true);
  }

  async function onCapture(file: File) {
    setCameraOpen(false);
    setError("");
    const url = URL.createObjectURL(file);
    if (activeType === "foer") setLocalFoer(url);
    else setLocalEfter(url);

    if (mode !== "project" || !projectId) return;

    setBusyUpload(true);
    try {
      const fd = new FormData();
      fd.append("type", activeType);
      fd.append("file", file);
      const data = await api<{ images: Img[] }>(
        "/api/projects/" + projectId + "/images",
        { method: "POST", body: fd },
      );
      setImages(data.images);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload fejlede");
    } finally {
      setBusyUpload(false);
    }
  }

  const statusChip = closed
    ? formatSamletTid(totalMs)
    : runningHere
      ? `I gang ${liveLabel}`
      : totalMs > 0
        ? `Samlet ${formatTotalDuration(totalMs)}`
        : "Klar";

  async function onToggleTime() {
    try {
      if (runningHere) await stop(sagId);
      else await start(sagId);
    } catch {
      /* surfaced */
    }
  }

  async function onCloseSag() {
    if (!confirm("Afslut sag og lås tiden?")) return;
    try {
      await close(sagId);
    } catch {
      /* surfaced */
    }
  }

  async function saveSessionEdit(id: string) {
    const draft = editDrafts[id];
    if (!draft?.started) return;
    try {
      await patchSession(id, {
        started_at: fromLocalInputValue(draft.started),
        ended_at: draft.ended ? fromLocalInputValue(draft.ended) : null,
      });
    } catch {
      /* surfaced */
    }
  }

  const showError = error || timeError;

  return (
    <div className="sag-screen">
      <header className="sag-top">
        <button type="button" className="sag-back no-swipe" onClick={onBack} aria-label="Tilbage">
          ‹
        </button>
        <div className={"sag-chip" + (runningHere ? " sag-chip-live" : "")}>
          <span className="sag-chip-dot" />
          {statusChip}
        </div>
      </header>

      <h1 className="sag-title">{heading}</h1>

      {showError ? <div className="error">{showError}</div> : null}

      <section className="sag-photos">
        <h2 className="sag-section-label">Før / Efter</h2>
        <div className="sag-photo-grid">
          <div className="sag-photo-col">
            <div className="sag-photo-label">FØR</div>
            <div className={"sag-photo-slot" + (foerUrl ? "" : " sag-photo-empty")}>
              {foerUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={foerUrl} alt="Før" />
              ) : (
                <button
                  type="button"
                  className="sag-photo-placeholder no-swipe"
                  onClick={() => openCamera("foer")}
                >
                  <IconCam />
                  <span>Tag før</span>
                </button>
              )}
            </div>
          </div>
          <div className="sag-photo-col">
            <div className="sag-photo-label">EFTER</div>
            <div
              className={
                "sag-photo-slot" + (efterUrl ? "" : " sag-photo-dashed")
              }
            >
              {efterUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={efterUrl} alt="Efter" />
              ) : (
                <button
                  type="button"
                  className="sag-photo-placeholder no-swipe"
                  onClick={() => openCamera("efter")}
                >
                  <IconCam />
                  <span>Tag efter</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn-field btn-field-primary no-swipe"
          disabled={busyUpload}
          onClick={() => openCamera(foerUrl ? "efter" : "foer")}
        >
          <IconCam />
          Tag foto
        </button>
      </section>

      <div className="sag-voice" aria-hidden>
        <div className="sag-voice-left">
          <IconMic />
          <div>
            <div className="sag-voice-title">Stemmenotat</div>
            <div className="hint">0:00</div>
          </div>
        </div>
        <div className="sag-voice-wave">
          <IconWave />
        </div>
        <div className="sag-voice-btn" />
      </div>

      <p className="sag-time">
        <IconClock size={16} />
        <span>
          {closed
            ? formatSamletTid(totalMs)
            : `I dag ${formatTotalDuration(todayMs)} · i alt ${formatTotalDuration(totalMs)}`}
        </span>
      </p>

      <div className="sag-actions">
        {!closed ? (
          <button
            type="button"
            className="btn-field btn-field-primary no-swipe"
            disabled={busyTime}
            onClick={() => void onToggleTime()}
          >
            <IconClock size={18} />
            {runningHere ? "Stop tid" : "Start tid"}
          </button>
        ) : null}
        {!closed ? (
          <button
            type="button"
            className="btn-field btn-field-outline no-swipe"
            disabled={busyTime}
            onClick={() => void onCloseSag()}
          >
            <IconCheck />
            Afslut sag
          </button>
        ) : (
          <p className="sag-closed-note">{formatSamletTid(totalMs)}</p>
        )}
      </div>

      <div className="sag-edit-block">
        <button
          type="button"
          className="linkish no-swipe"
          onClick={() => setEditOpen((v) => !v)}
        >
          {editOpen ? "Skjul tider" : "Ret tider (glemt stop)"}
        </button>
        {editOpen ? (
          <ul className="sag-session-list">
            {(summary?.sessions || []).length === 0 ? (
              <li className="hint">Ingen sessioner endnu</li>
            ) : (
              (summary?.sessions || []).map((s) => (
                <li key={s.id} className="sag-session-row">
                  <label className="sag-session-field">
                    <span>Start</span>
                    <input
                      type="datetime-local"
                      className="no-swipe"
                      value={editDrafts[s.id]?.started || ""}
                      disabled={closed && !s.ended_at}
                      onChange={(e) =>
                        setEditDrafts((prev) => ({
                          ...prev,
                          [s.id]: {
                            started: e.target.value,
                            ended: prev[s.id]?.ended || "",
                          },
                        }))
                      }
                    />
                  </label>
                  <label className="sag-session-field">
                    <span>Stop</span>
                    <input
                      type="datetime-local"
                      className="no-swipe"
                      value={editDrafts[s.id]?.ended || ""}
                      onChange={(e) =>
                        setEditDrafts((prev) => ({
                          ...prev,
                          [s.id]: {
                            started: prev[s.id]?.started || "",
                            ended: e.target.value,
                          },
                        }))
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="btn-field btn-field-outline no-swipe sag-session-save"
                    disabled={busyTime}
                    onClick={() => void saveSessionEdit(s.id)}
                  >
                    Gem
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>

      {mode === "project" && projectId ? (
        <p className="sag-admin-link">
          <button
            type="button"
            className="linkish no-swipe"
            onClick={() => router.push("/app/projekter/" + projectId)}
          >
            Fuld projektvisning (godkend / publicér)
          </button>
        </p>
      ) : null}

      <CameraCapture
        open={cameraOpen}
        title={activeType === "efter" ? "Efter" : "Før"}
        overlayUrl={activeType === "efter" ? foerUrl : null}
        onCapture={onCapture}
        onClose={() => setCameraOpen(false)}
      />
    </div>
  );
}
