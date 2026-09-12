"use client";

/**
 * Kamera: onion-skin før-overlay + valgfri HUD (gitter/kors/vaterpas).
 * Capture = KUN rent kamerabillede — overlay/HUD aldrig i JPEG.
 */
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  title: string;
  overlayUrl?: string | null;
  onCapture: (file: File) => void;
  onClose: () => void;
};

type Level = "green" | "yellow" | "red" | "off";

const DEFAULT_OVERLAY_OPACITY = 0.35;

function levelFromAngles(gamma: number | null, beta: number | null): Level {
  if (gamma == null || beta == null || Number.isNaN(gamma) || Number.isNaN(beta)) {
    return "off";
  }
  const side = Math.abs(gamma);
  const upright = Math.abs(beta - 90);
  if (side <= 10 && upright <= 18) return "green";
  if (side <= 18 && upright <= 28) return "yellow";
  return "red";
}

async function lockZoomIfPossible(track: MediaStreamTrack) {
  const caps = track.getCapabilities?.() as
    | (MediaTrackCapabilities & { zoom?: { min: number; max: number } })
    | undefined;
  if (!caps || caps.zoom == null) return;
  const zoom = typeof caps.zoom === "object" ? caps.zoom.min : 1;
  try {
    await track.applyConstraints({
      advanced: [{ zoom } as MediaTrackConstraintSet],
    });
  } catch {
    /* Safari/Chrome may ignore */
  }
}

export default function CameraCapture({
  open,
  title,
  overlayUrl,
  onCapture,
  onClose,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [usingNative, setUsingNative] = useState(false);
  const [level, setLevel] = useState<Level>("off");
  const [confirmSkew, setConfirmSkew] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [overlayOpacity, setOverlayOpacity] = useState(DEFAULT_OVERLAY_OPACITY);
  const [showHud, setShowHud] = useState(true);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setReady(false);
  }, []);

  const startStream = useCallback(async () => {
    setError("");
    setUsingNative(false);
    setConfirmSkew(false);
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      if (track) void lockZoomIfPossible(track);
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
        setReady(true);
      }
    } catch {
      setUsingNative(true);
      setError("");
      setTimeout(() => fileRef.current?.click(), 80);
    }
  }, [stopStream]);

  useEffect(() => {
    if (!open) {
      stopStream();
      setConfirmSkew(false);
      return;
    }
    setShowOverlay(true);
    setOverlayOpacity(DEFAULT_OVERLAY_OPACITY);
    setShowHud(true);
    void startStream();
    return () => stopStream();
  }, [open, startStream, stopStream]);

  useEffect(() => {
    if (!open || usingNative || !showHud) {
      setLevel("off");
      return;
    }

    let last = 0;
    const onOrient = (e: DeviceOrientationEvent) => {
      const now = Date.now();
      if (now - last < 80) return;
      last = now;
      setLevel(levelFromAngles(e.gamma, e.beta));
    };

    const bind = async () => {
      const DOE = DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<string>;
      };
      try {
        if (typeof DOE.requestPermission === "function") {
          const res = await DOE.requestPermission();
          if (res !== "granted") {
            setLevel("off");
            return;
          }
        }
      } catch {
        setLevel("off");
        return;
      }
      window.addEventListener("deviceorientation", onOrient, true);
    };

    void bind();
    return () => window.removeEventListener("deviceorientation", onOrient, true);
  }, [open, usingNative, showHud]);

  /** Full camera frame only — never overlay, grid, or text. */
  function captureFullFrame() {
    const video = videoRef.current;
    if (!video || !ready) return null;
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, w, h);
    return canvas;
  }

  function emitBlob(canvas: HTMLCanvasElement) {
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `foto-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        stopStream();
        setConfirmSkew(false);
        onCapture(file);
      },
      "image/jpeg",
      0.9,
    );
  }

  function shutter() {
    if (!ready) return;
    if (showHud && level === "red" && !confirmSkew) {
      setConfirmSkew(true);
      return;
    }
    const canvas = captureFullFrame();
    if (!canvas) return;
    emitBlob(canvas);
  }

  function onNativeFile(file: File | undefined) {
    if (!file) {
      onClose();
      return;
    }
    onCapture(file);
  }

  if (!open) return null;

  const hasOverlay = Boolean(overlayUrl);
  const levelLabel =
    level === "green"
      ? "Lige"
      : level === "yellow"
        ? "Næsten lige"
        : level === "red"
          ? "Hold telefonen lodret"
          : "Vaterpas ikke tilgængelig";

  return (
    <div className="cam-fullscreen" role="dialog" aria-modal="true" aria-label={title}>
      <div className="cam-top">
        <span className="cam-title">{title}</span>
        <div className="cam-top-actions">
          <button
            type="button"
            className={"cam-hud-toggle" + (showHud ? " is-on" : "")}
            aria-pressed={showHud}
            onClick={() => setShowHud((v) => !v)}
          >
            HUD
          </button>
          <button type="button" className="cam-close" onClick={onClose}>
            Luk
          </button>
        </div>
      </div>

      {!usingNative ? (
        <div className="cam-stage">
          <video
            ref={videoRef}
            className="cam-video"
            playsInline
            muted
            autoPlay
          />
          {hasOverlay && showOverlay ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={overlayUrl!}
              alt=""
              className="cam-overlay"
              style={{ opacity: overlayOpacity }}
            />
          ) : null}
          {showHud ? (
            <>
              <div className="cam-grid" aria-hidden="true">
                <span className="cam-grid-v" style={{ left: "33.333%" }} />
                <span className="cam-grid-v" style={{ left: "66.666%" }} />
                <span className="cam-grid-h" style={{ top: "33.333%" }} />
                <span className="cam-grid-h" style={{ top: "66.666%" }} />
              </div>
              <div className="cam-cross" aria-hidden="true">
                <span className="cam-cross-h" />
                <span className="cam-cross-v" />
              </div>
              <div className={"cam-level cam-level-" + level} aria-live="polite">
                <span className="cam-level-dot" />
                <span>{levelLabel}</span>
              </div>
            </>
          ) : null}
          {hasOverlay ? (
            <p className="cam-onion-hint">
              Siges efter ind over før-billedet. Flyt dig til samme sted.
            </p>
          ) : null}
          {!ready && !error ? (
            <p className="cam-hint">Åbner kamera…</p>
          ) : null}
          {error ? <p className="cam-hint">{error}</p> : null}
          {confirmSkew ? (
            <div className="cam-skew">
              <p>Telefonen er skæv. Billedet passer dårligere i før/efter.</p>
              <button type="button" className="btn btn-primary" onClick={shutter}>
                Gem alligevel
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmSkew(false)}
              >
                Prøv igen
              </button>
            </div>
          ) : null}
          {hasOverlay ? (
            <div className="cam-overlay-controls">
              <button
                type="button"
                className={
                  "cam-overlay-toggle" + (showOverlay ? " is-on" : "")
                }
                aria-pressed={showOverlay}
                onClick={() => setShowOverlay((v) => !v)}
              >
                Vis før
              </button>
              {showOverlay ? (
                <label className="cam-overlay-slider">
                  <span className="cam-overlay-slider-label">Styrke</span>
                  <input
                    type="range"
                    min={0.1}
                    max={0.7}
                    step={0.05}
                    value={overlayOpacity}
                    onChange={(e) =>
                      setOverlayOpacity(Number(e.target.value))
                    }
                    aria-label="Før-overlay styrke"
                  />
                </label>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="cam-stage cam-native">
          <p className="cam-hint">Åbner telefonens kamera…</p>
          {overlayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={overlayUrl} alt="Før (reference)" className="cam-native-ref" />
          ) : null}
          {overlayUrl ? (
            <p className="hint" style={{ textAlign: "center", maxWidth: 280 }}>
              Siges efter ind over før-billedet. Flyt dig til samme sted.
            </p>
          ) : (
            <p className="hint" style={{ textAlign: "center", maxWidth: 280 }}>
              Gitter og vaterpas virker i live-kamera. Hvis iPhone åbner systemkameraet, sigt efter samme kanter som før-billedet.
            </p>
          )}
          <button
            type="button"
            className="btn btn-primary cam-native-btn"
            onClick={() => fileRef.current?.click()}
          >
            Tag foto
          </button>
        </div>
      )}

      {!usingNative ? (
        <div className="cam-bottom">
          <button
            type="button"
            className="cam-shutter"
            aria-label="Tag foto"
            disabled={!ready || confirmSkew}
            onClick={shutter}
          />
        </div>
      ) : null}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="cam-file"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          onNativeFile(f);
        }}
      />
    </div>
  );
}
