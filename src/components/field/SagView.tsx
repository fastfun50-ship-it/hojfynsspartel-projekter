"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CameraCapture from "@/components/CameraCapture";
import { api } from "@/lib/client";
import { DEMO_NEXT } from "@/lib/fieldDemo";
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

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export default function SagView({
  mode,
  projectId,
  title,
  initialImages = [],
  onBack,
}: Props) {
  const router = useRouter();
  const heading = title || DEMO_NEXT.titleShort;
  const [images, setImages] = useState<Img[]>(initialImages);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [activeType, setActiveType] = useState<ImageType>("foer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"klar" | "i_gang" | "faerdig_dag" | "faerdig">(
    "i_gang",
  );
  const [startedAt] = useState(() => Date.now() - 72_000);
  const [tick, setTick] = useState(Date.now());
  const [localFoer, setLocalFoer] = useState<string | null>(null);
  const [localEfter, setLocalEfter] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setImages(initialImages);
  }, [initialImages]);

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

    setBusy(true);
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
      setBusy(false);
    }
  }

  const elapsed = formatElapsed(tick - startedAt);
  const statusChip =
    status === "faerdig"
      ? "Færdig"
      : status === "faerdig_dag"
        ? "Færdig for i dag"
        : `I gang · ${elapsed}`;

  return (
    <div className="sag-screen">
      <header className="sag-top">
        <button type="button" className="sag-back no-swipe" onClick={onBack} aria-label="Tilbage">
          ‹
        </button>
        <div className="sag-chip">
          <span className="sag-chip-dot" />
          {statusChip}
        </div>
      </header>

      <h1 className="sag-title">{heading}</h1>

      {error ? <div className="error">{error}</div> : null}

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
          disabled={busy}
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
        <span>I dag 3 t 40 · i alt 9 t 10</span>
      </p>

      <div className="sag-actions">
        <button
          type="button"
          className="btn-field btn-field-primary no-swipe"
          onClick={() => setStatus("faerdig_dag")}
        >
          <IconCheck />
          Færdig for i dag
        </button>
        <button
          type="button"
          className="btn-field btn-field-outline no-swipe"
          onClick={() => setStatus("faerdig")}
        >
          <IconCheck />
          Opgaven er færdig
        </button>
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
