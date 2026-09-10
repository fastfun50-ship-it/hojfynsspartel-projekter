"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  IMAGE_TYPE_LABELS,
  IMAGE_TYPES,
  STATUS_LABELS,
} from "@/lib/constants";
import { adjustPrice, formatKr } from "@/lib/prices";
import { saveLastAction } from "@/lib/lastAction";
import type { ImageType, Project, ProjectImage } from "@/lib/types";
import CameraCapture from "@/components/CameraCapture";
import DeleteProjectButton from "@/components/DeleteProjectButton";

type Img = ProjectImage & { url: string };
type Firm = { global_prisjustering_procent: number };

export default function ProjectDetailClient({
  initialProject,
  initialImages,
  userId,
  isAdmin,
  canDeleteProject,
}: {
  initialProject: Project;
  initialImages: Img[];
  userId: string;
  isAdmin: boolean;
  canDeleteProject: boolean;
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
  const [firm, setFirm] = useState<Firm | null>(null);
  const [rejectNote, setRejectNote] = useState("");

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

  const canAdminPublish =
    isAdmin &&
    !pendingFile &&
    (project.status === "kladde" ||
      project.status === "afventer_godkendelse" ||
      project.status === "godkendt" ||
      project.status === "skjult" ||
      needsSiteUpdate);

  const showMesterCta =
    !isAdmin && !pendingFile && (project.status === "kladde" || needsSiteUpdate);

  const showCtaBar = canAdminPublish || showMesterCta;
  const showReject = isAdmin && project.status === "afventer_godkendelse" && !pendingFile;
  const showHide =
    isAdmin && project.status === "publiceret" && !needsSiteUpdate && !pendingFile;

  useEffect(() => {
    return () => {
      if (pendingUrl) URL.revokeObjectURL(pendingUrl);
    };
  }, [pendingUrl]);

  useEffect(() => {
    if (!isAdmin) return;
    api<{ firm: Firm }>("/api/firm")
      .then((d) => setFirm(d.firm))
      .catch(() => {});
  }, [isAdmin]);

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
      saveLastAction("submit", project.id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke sende");
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    setBusy(true);
    setError("");
    try {
      const data = await api<{ project: Project }>(
        "/api/projects/" + project.id + "/publish",
        { method: "POST", body: "{}" },
      );
      setProject(data.project);
      saveLastAction("publish", project.id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publicering fejlede");
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    setBusy(true);
    setError("");
    try {
      const data = await api<{ project: Project }>(
        "/api/projects/" + project.id + "/reject",
        { method: "POST", body: JSON.stringify({ note: rejectNote }) },
      );
      setProject(data.project);
      setRejectNote("");
      saveLastAction("reject", project.id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Afvisning fejlede");
    } finally {
      setBusy(false);
    }
  }

  async function hide() {
    setBusy(true);
    setError("");
    try {
      const data = await api<{ project: Project }>(
        "/api/projects/" + project.id + "/hide",
        { method: "POST", body: "{}" },
      );
      setProject(data.project);
      saveLastAction("hide", project.id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke skjule");
    } finally {
      setBusy(false);
    }
  }

  async function saveFields() {
    setBusy(true);
    setError("");
    try {
      const data = await api<{ project: Project }>("/api/projects/" + project.id, {
        method: "PATCH",
        body: JSON.stringify({
          title: project.title,
          category: project.category,
          scope: project.scope,
          year: project.year,
          price_from: project.price_from,
          price_to: project.price_to,
          may_show_public: !!project.may_show_public,
          show_price_on_site: !!project.show_price_on_site,
        }),
      });
      setProject(data.project);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gem fejlede");
    } finally {
      setBusy(false);
    }
  }

  const showBeforeOverlay = activeType === "efter" && !!latestFoer;
  const pct = firm?.global_prisjustering_procent ?? 0;

  return (
    <div className={"stack" + (showCtaBar ? " has-sticky-cta" : "")}>
      <div className="project-head">
        <h1 className="page-title">{project.title}</h1>
        <span className="badge">{STATUS_LABELS[project.status]}</span>
      </div>
      {canDeleteProject ? (
        <div className="project-card-meta" style={{ padding: 0 }}>
          <span />
          <DeleteProjectButton projectId={project.id} redirectTo="/app/projekter" />
        </div>
      ) : null}
      <div className="hint">{CATEGORY_LABELS[project.category]}</div>
      {project.status === "afventer_godkendelse" ? (
        <p className="hint" style={{ margin: 0 }}>
          Sendt — afventer godkendelse.
        </p>
      ) : null}
      {project.reject_note ? (
        <div className="error" style={{ marginTop: 0 }}>
          Afvist: {project.reject_note}
        </div>
      ) : null}

      {error ? <div className="error">{error}</div> : null}

      {pendingUrl ? (
        <div className="stack review-panel">
          <p className="review-title">Tjek {IMAGE_TYPE_LABELS[activeType]}</p>
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
            className="btn btn-secondary"
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
                className={"pill" + (activeType === t ? " pill-active" : "")}
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

      {isAdmin ? (
        <details className="edit-fold">
          <summary>Rediger tekst</summary>
          <div className="stack" style={{ marginTop: "0.85rem" }}>
            <div>
              <label className="label">Titel</label>
              <input
                className="input"
                value={project.title}
                onChange={(e) => setProject({ ...project, title: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Kategori</label>
              <select
                className="select"
                value={project.category}
                onChange={(e) =>
                  setProject({ ...project, category: e.target.value as Project["category"] })
                }
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Scope / omfang</label>
              <textarea
                className="textarea"
                value={project.scope || ""}
                onChange={(e) => setProject({ ...project, scope: e.target.value })}
              />
            </div>
            <div>
              <label className="label">År</label>
              <input
                className="input"
                type="number"
                value={project.year ?? ""}
                onChange={(e) =>
                  setProject({
                    ...project,
                    year: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <label className="label">Pris fra (grundpris)</label>
              <input
                className="input"
                type="number"
                value={project.price_from ?? ""}
                onChange={(e) =>
                  setProject({
                    ...project,
                    price_from: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
              <p className="hint">
                Vist: {formatKr(adjustPrice(project.price_from, pct)) || "—"}
              </p>
            </div>
            <div>
              <label className="label">Pris til (grundpris)</label>
              <input
                className="input"
                type="number"
                value={project.price_to ?? ""}
                onChange={(e) =>
                  setProject({
                    ...project,
                    price_to: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
              <p className="hint">
                Vist: {formatKr(adjustPrice(project.price_to, pct)) || "—"}
              </p>
            </div>
            <label className="check-row">
              <input
                type="checkbox"
                checked={!!project.may_show_public}
                onChange={(e) =>
                  setProject({ ...project, may_show_public: e.target.checked ? 1 : 0 })
                }
              />
              Må vises offentligt
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={!!project.show_price_on_site}
                onChange={(e) =>
                  setProject({ ...project, show_price_on_site: e.target.checked ? 1 : 0 })
                }
              />
              Vis pris på site
            </label>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={() => void saveFields()}
            >
              Gem tekst
            </button>
          </div>
        </details>
      ) : null}

      {showReject ? (
        <div className="stack">
          <input
            className="input"
            placeholder="Note (valgfri)"
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-secondary"
            disabled={busy}
            onClick={() => void reject()}
          >
            Afvis
          </button>
        </div>
      ) : null}

      {showHide ? (
        <button
          type="button"
          className="btn btn-ghost"
          disabled={busy}
          onClick={() => void hide()}
        >
          Skjul
        </button>
      ) : null}

      {showCtaBar ? (
        <div className="sticky-cta" role="region" aria-label="Publicér">
          {canAdminPublish ? (
            <button
              type="button"
              className="btn btn-primary btn-xl"
              disabled={busy}
              onClick={() => void publish()}
            >
              {busy ? "Publicerer…" : "Publicér"}
            </button>
          ) : null}
          {showMesterCta ? (
            <button
              type="button"
              className="btn btn-primary btn-xl"
              disabled={busy}
              onClick={() => void submit()}
            >
              {busy ? "Sender…" : "Læg på siden"}
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
