"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import {
  CATEGORY_LABELS,
  IMAGE_TYPE_LABELS,
  IMAGE_TYPES,
} from "@/lib/constants";
import type { ImageType, Project, ProjectImage } from "@/lib/types";
import CameraCapture from "@/components/CameraCapture";

type Img = ProjectImage & { url: string };

export default function ProjectDetailClient({
  initialProject,
  initialImages,
  userId,
}: {
  initialProject: Project;
  initialImages: Img[];
  userId: string;
}) {
  const router = useRouter();
  const [project, setProject] = useState(initialProject);
  const [images, setImages] = useState(initialImages);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeType, setActiveType] = useState<ImageType>("foer");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  const latestFoer = useMemo(
    () => [...images].filter((i) => i.type === "foer").at(-1),
    [images],
  );

  /** Før/efter newer than last publish → mester must re-submit (gate stays). */
  const needsSiteUpdate = useMemo(() => {
    if (project.status !== "publiceret" || !project.published_at) return false;
    const publishedMs = Date.parse(project.published_at);
    if (Number.isNaN(publishedMs)) return false;
    return images.some((img) => {
      if (img.type !== "foer" && img.type !== "efter") return false;
      const createdMs = Date.parse(img.created_at);
      return !Number.isNaN(createdMs) && createdMs > publishedMs;
    });
  }, [project.status, project.published_at, images]);

  const canDelete =
    project.status === "kladde" || project.status === "afventer_godkendelse";

  const showSendCta = project.status === "kladde" && !pendingFile;
  const showUpdateCta = needsSiteUpdate && !pendingFile;
  const showCtaBar = showSendCta || showUpdateCta;

  useEffect(() => {
    return () => {
      if (pendingUrl) URL.revokeObjectURL(pendingUrl);
    };
  }, [pendingUrl]);

  function clearPending() {
    if (pendingUrl) URL.revokeObjectURL(pendingUrl);
    setPendingFile(null);
    setPendingUrl(null);
  }

  function onCapture(file: File) {
    setError("");
    setCameraOpen(false);
    if (pendingUrl) URL.revokeObjectURL(pendingUrl);
    setPendingFile(file);
    setPendingUrl(URL.createObjectURL(file));
  }

  async function confirmUpload() {
    if (!pendingFile) return;
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("type", activeType);
      fd.append("file", pendingFile);
      const data = await api<{ images: Img[] }>(
        "/api/projects/" + project.id + "/images",
        { method: "POST", body: fd },
      );
      setImages(data.images);
      clearPending();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload fejlede");
    } finally {
      setBusy(false);
    }
  }

  function retake() {
    clearPending();
    setCameraOpen(true);
  }

  async function removeImage(imageId: string) {
    if (!confirm("Slet billede?")) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/projects/" + project.id + "/images/" + imageId, {
        method: "DELETE",
      });
      setImages((prev) => prev.filter((i) => i.id !== imageId));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sletning fejlede");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const data = await api<{ project: Project }>(
        "/api/projects/" + project.id + "/submit",
        { method: "POST", body: "{}" },
      );
      setProject(data.project);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke sende");
    } finally {
      setBusy(false);
    }
  }

  const showBeforeOverlay = activeType === "efter" && !!latestFoer;

  return (
    <div className={"stack" + (showCtaBar ? " has-mester-cta" : "")}>
      <div>
        <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.3rem" }}>{project.title}</h1>
        <div className="hint">{CATEGORY_LABELS[project.category]}</div>
        {project.status === "afventer_godkendelse" ? (
          <p className="hint" style={{ margin: "0.5rem 0 0" }}>
            Sendt — afventer godkendelse.
          </p>
        ) : null}
        {project.reject_note ? (
          <div className="error" style={{ marginTop: "0.75rem" }}>
            Afvist: {project.reject_note}
          </div>
        ) : null}
      </div>

      {error ? <div className="error">{error}</div> : null}

      {pendingUrl ? (
        <div className="stack review-panel">
          <p style={{ margin: 0, fontWeight: 700, fontSize: "1.1rem" }}>
            Tjek {IMAGE_TYPE_LABELS[activeType]}
          </p>
          <div className="compare-frame">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pendingUrl} alt="Nyt foto" className="compare-base" />
            {showBeforeOverlay ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={latestFoer!.url}
                alt="Før som overlay"
                className="compare-overlay"
              />
            ) : null}
          </div>
          {showBeforeOverlay ? (
            <p className="hint" style={{ margin: 0 }}>
              Før ligger som overlay oven på efter — tjek vinkel.
            </p>
          ) : null}
          <button
            type="button"
            className="btn btn-primary btn-xl"
            disabled={busy}
            onClick={() => void confirmUpload()}
          >
            {busy ? "Gemmer…" : "Gem"}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-xl"
            disabled={busy}
            onClick={retake}
          >
            Tag om
          </button>
        </div>
      ) : (
        <div className="card stack">
          <strong>Tag foto</strong>
          <div className="type-tabs">
            {IMAGE_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                className={
                  "btn " + (activeType === t ? "btn-primary" : "btn-ghost")
                }
                disabled={busy}
                onClick={() => setActiveType(t)}
              >
                {IMAGE_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
          {activeType === "efter" && !latestFoer ? (
            <p className="hint">Tag et før-foto først — så kan du lægge det over efter.</p>
          ) : null}
          <button
            type="button"
            className="btn btn-primary btn-xl"
            disabled={busy}
            onClick={() => setCameraOpen(true)}
          >
            Åbn kamera — {IMAGE_TYPE_LABELS[activeType]}
          </button>
        </div>
      )}

      {IMAGE_TYPES.map((t) => {
        const group = images.filter((i) => i.type === t);
        if (!group.length) return null;
        return (
          <div key={t} className="card stack">
            <strong>{IMAGE_TYPE_LABELS[t]}</strong>
            <div className="grid-imgs">
              {group.map((img) => (
                <div key={img.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={t} />
                  {canDelete && img.created_by === userId ? (
                    <button
                      type="button"
                      className="btn btn-danger"
                      style={{ marginTop: "0.35rem", minHeight: 40 }}
                      disabled={busy}
                      onClick={() => void removeImage(img.id)}
                    >
                      Slet
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {showCtaBar ? (
        <div className="mester-cta" role="region" aria-label="Send projekt">
          {showSendCta ? (
            <button
              type="button"
              className="btn btn-primary btn-xl"
              disabled={busy}
              onClick={() => void submit()}
            >
              <span className="mester-cta-label">
                <span className="mester-cta-title">
                  {busy ? "Sender…" : "Send til godkendelse"}
                </span>
                <span className="mester-cta-sub">Læg på siden</span>
              </span>
            </button>
          ) : null}
          {showUpdateCta ? (
            <button
              type="button"
              className="btn btn-primary btn-xl"
              disabled={busy}
              onClick={() => void submit()}
            >
              <span className="mester-cta-label">
                <span className="mester-cta-title">
                  {busy ? "Sender…" : "Opdatér på siden"}
                </span>
                <span className="mester-cta-sub">
                  Sendes til godkendelse igen
                </span>
              </span>
            </button>
          ) : null}
        </div>
      ) : null}

      <CameraCapture
        open={cameraOpen}
        title={IMAGE_TYPE_LABELS[activeType]}
        overlayUrl={showBeforeOverlay ? latestFoer!.url : null}
        onCapture={onCapture}
        onClose={() => setCameraOpen(false)}
      />
    </div>
  );
}
