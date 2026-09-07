"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import {
  CATEGORY_LABELS,
  IMAGE_TYPE_LABELS,
  STATUS_LABELS,
  IMAGE_TYPES,
} from "@/lib/constants";
import type { ImageType, Project, ProjectImage } from "@/lib/types";

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
  const fileRef = useRef<HTMLInputElement>(null);

  const latestFoer = useMemo(
    () => [...images].filter((i) => i.type === "foer").at(-1),
    [images],
  );

  const canDelete =
    project.status === "kladde" || project.status === "afventer_godkendelse";

  async function upload(file: File) {
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("type", activeType);
      fd.append("file", file);
      const data = await api<{ images: Img[] }>(
        "/api/projects/" + project.id + "/images",
        { method: "POST", body: fd, headers: {} },
      );
      setImages(data.images);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload fejlede");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
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

  return (
    <div className="stack">
      <div>
        <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.3rem" }}>{project.title}</h1>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          <span className="badge">{STATUS_LABELS[project.status]}</span>
          <span className="badge">{CATEGORY_LABELS[project.category]}</span>
        </div>
        {project.reject_note ? (
          <div className="error" style={{ marginTop: "0.75rem" }}>
            Afvist: {project.reject_note}
          </div>
        ) : null}
      </div>

      {error ? <div className="error">{error}</div> : null}

      <div className="card stack">
        <strong>Tilføj foto</strong>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.4rem" }}>
          {IMAGE_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              className={"btn " + (activeType === t ? "btn-primary" : "btn-ghost")}
              onClick={() => setActiveType(t)}
            >
              {IMAGE_TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        {activeType === "efter" ? (
          <div className="card" style={{ background: "#1a1814" }}>
            <p className="hint" style={{ marginTop: 0 }}>
              Stil dig omtrent samme sted og vinkel som før-billedet.
            </p>
            {latestFoer ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={latestFoer.url} alt="Seneste før" />
            ) : (
              <p className="hint">Ingen før-billeder endnu.</p>
            )}
          </div>
        ) : null}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
          }}
        />
        <p className="hint">Åbn kamera eller vælg fra rulle.</p>
      </div>

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

      {project.status === "kladde" ? (
        <button className="btn btn-primary" disabled={busy} onClick={() => void submit()}>
          Send til godkendelse
        </button>
      ) : null}
    </div>
  );
}

