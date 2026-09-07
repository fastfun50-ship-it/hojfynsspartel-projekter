"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  title: string;
  overlayUrl?: string | null;
  onCapture: (file: File) => void;
  onClose: () => void;
};

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

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setReady(false);
  }, []);

  const startStream = useCallback(async () => {
    setError("");
    setUsingNative(false);
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
      // Fall back to native camera / file picker (works well on iPhone).
      setTimeout(() => fileRef.current?.click(), 80);
    }
  }, [stopStream]);

  useEffect(() => {
    if (!open) {
      stopStream();
      return;
    }
    void startStream();
    return () => stopStream();
  }, [open, startStream, stopStream]);

  function shutter() {
    const video = videoRef.current;
    if (!video || !ready) return;
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `foto-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        stopStream();
        onCapture(file);
      },
      "image/jpeg",
      0.92,
    );
  }

  function onNativeFile(file: File | undefined) {
    if (!file) {
      onClose();
      return;
    }
    onCapture(file);
  }

  if (!open) return null;

  return (
    <div className="cam-fullscreen" role="dialog" aria-modal="true" aria-label={title}>
      <div className="cam-top">
        <span className="cam-title">{title}</span>
        <button type="button" className="cam-close" onClick={onClose}>
          Luk
        </button>
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
          {overlayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={overlayUrl} alt="" className="cam-overlay" />
          ) : null}
          {!ready && !error ? (
            <p className="cam-hint">Åbner kamera…</p>
          ) : null}
          {error ? <p className="cam-hint">{error}</p> : null}
        </div>
      ) : (
        <div className="cam-stage cam-native">
          <p className="cam-hint">Åbner telefonens kamera…</p>
          {overlayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={overlayUrl} alt="Før (reference)" className="cam-native-ref" />
          ) : null}
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
            disabled={!ready}
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
