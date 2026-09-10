"use client";

/**
 * Kamera v1: 3×3 gitter + vaterpas + ghost (overlayUrl) + samme cover-crop.
 * v1.1 (ikke her): auto-align / feature matching.
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

export default function CameraCapture({
  open,
  title,
  overlayUrl,
  onCapture,
  onClose,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [usingNative, setUsingNative] = useState(false);
  const [level, setLevel] = useState<Level>("off");
  const [confirmSkew, setConfirmSkew] = useState(false);

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
    void startStream();
    return () => stopStream();
  }, [open, startStream, stopStream]);

  useEffect(() => {
    if (!open || usingNative) {
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
  }, [open, usingNative]);

  function captureCoverCrop() {
    const video = videoRef.current;
    const stage = stageRef.current;
    if (!video || !ready) return null;
    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;
    const sw = stage?.clientWidth || vw;
    const sh = stage?.clientHeight || vh;
    const scale = Math.max(sw / vw, sh / vh);
    const cropW = sw / scale;
    const cropH = sh / scale;
    const sx = (vw - cropW) / 2;
    const sy = (vh - cropH) / 2;

    let outW = Math.round(cropW);
    let outH = Math.round(cropH);
    const long = Math.max(outW, outH);
    if (long > 2000) {
      const f = 2000 / long;
      outW = Math.round(outW * f);
      outH = Math.round(outH * f);
    }

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, outW, outH);
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
      0.82,
    );
  }

  function shutter() {
    if (!ready) return;
    if (level === "red" && !confirmSkew) {
      setConfirmSkew(true);
      return;
    }
    const canvas = captureCoverCrop();
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
        <button type="button" className="cam-close" onClick={onClose}>
          Luk
        </button>
      </div>

      {!usingNative ? (
        <div className="cam-stage" ref={stageRef}>
          <video
            ref={videoRef}
            className="cam-video"
            playsInline
            muted
            autoPlay
          />
          {overlayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={overlayUrl} alt="" className="cam-overlay" />
          ) : null}
          <div className="cam-grid" aria-hidden="true">
            <span className="cam-grid-v" style={{ left: "33.333%" }} />
            <span className="cam-grid-v" style={{ left: "66.666%" }} />
            <span className="cam-grid-h" style={{ top: "33.333%" }} />
            <span className="cam-grid-h" style={{ top: "66.666%" }} />
          </div>
          <div className={"cam-level cam-level-" + level} aria-live="polite">
            <span className="cam-level-dot" />
            <span>{levelLabel}</span>
          </div>
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
        </div>
      ) : (
        <div className="cam-stage cam-native">
          <p className="cam-hint">Åbner telefonens kamera…</p>
          {overlayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={overlayUrl} alt="Før (reference)" className="cam-native-ref" />
          ) : null}
          <p className="hint" style={{ textAlign: "center", maxWidth: 280 }}>
            Gitter og vaterpas virker i live-kamera. Hvis iPhone åbner systemkameraet, sigt efter samme kanter som før-billedet.
          </p>
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