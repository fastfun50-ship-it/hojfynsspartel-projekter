/**
 * Next/TS wrapper around UMD EccAlign (src/lib/ecc-align.js).
 * Overlay/HUD must never be baked into source pixels — callers pass clean capture blobs only.
 */
import EccAlignModule from "./ecc-align.js";

export type AlignResult = {
  alignedFile: File;
  ok: boolean;
  score: number;
  message?: string;
};

const WARN = "kunne ikke låse helt — tag evt. om";
const MIN_ECC = 0.35;

type EccApi = {
  eccAlign: (
    before: CanvasImageSource,
    after: CanvasImageSource,
    opts?: {
      maxSide?: number;
      levels?: number;
      maxIter?: number;
      minEcc?: number;
    },
  ) => Promise<{
    ok: boolean;
    ecc: number;
    alignedCanvas: HTMLCanvasElement;
    warp: {
      scale: number;
      rotationRad: number;
      rotationDeg: number;
      tx: number;
      ty: number;
    };
  }>;
};

const EccAlign = (
  (EccAlignModule as unknown as { default?: EccApi }).default ??
  (EccAlignModule as unknown as EccApi)
) as EccApi;

function loadImage(src: string | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const url = typeof src === "string" ? src : URL.createObjectURL(src);
    const revoke = typeof src !== "string";
    img.onload = () => {
      if (revoke) URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      if (revoke) URL.revokeObjectURL(url);
      reject(new Error("Kunne ikke indlæse billede"));
    };
    img.src = url;
  });
}

function canvasToJpegFile(canvas: HTMLCanvasElement, name: string): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("JPEG encode fejlede"));
          return;
        }
        resolve(new File([blob], name, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9,
    );
  });
}

function fallbackFile(afterBlob: Blob): File {
  return new File([afterBlob], `efter-${Date.now()}.jpg`, { type: "image/jpeg" });
}

/**
 * Keep before pixel size for slider registration. When warp leaves a clear
 * inset overlap (alpha holes), composite only that overlap onto black.
 */
function cropCommonOverlapToBeforeSize(aligned: HTMLCanvasElement): HTMLCanvasElement {
  const bw = aligned.width;
  const bh = aligned.height;
  const actx = aligned.getContext("2d", { willReadFrequently: true });
  if (!actx || !bw || !bh) return aligned;

  const { data } = actx.getImageData(0, 0, bw, bh);
  let minX = bw;
  let minY = bh;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      if (data[(y * bw + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) return aligned;

  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  if (cw >= bw * 0.98 && ch >= bh * 0.98) return aligned;

  const out = document.createElement("canvas");
  out.width = bw;
  out.height = bh;
  const ctx = out.getContext("2d");
  if (!ctx) return aligned;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, bw, bh);
  ctx.drawImage(aligned, minX, minY, cw, ch, minX, minY, cw, ch);
  return out;
}

/**
 * Align after to before via EccAlign.eccAlign.
 * ok → aligned canvas for slider; else raw after + soft warn.
 */
export async function alignAfterToBefore(
  beforeUrl: string,
  afterBlob: Blob,
): Promise<AlignResult> {
  try {
    const [beforeImg, afterImg] = await Promise.all([
      loadImage(beforeUrl),
      loadImage(afterBlob),
    ]);

    const res = await EccAlign.eccAlign(beforeImg, afterImg, {
      maxSide: 480,
      levels: 4,
      maxIter: 14,
      minEcc: MIN_ECC,
    });

    const ok = Boolean(res.ok) || (typeof res.ecc === "number" && res.ecc >= MIN_ECC);

    if (!ok) {
      return {
        alignedFile: fallbackFile(afterBlob),
        ok: false,
        score: typeof res.ecc === "number" ? res.ecc : 0,
        message: WARN,
      };
    }

    const cropped = cropCommonOverlapToBeforeSize(res.alignedCanvas);
    const alignedFile = await canvasToJpegFile(
      cropped,
      `efter-aligned-${Date.now()}.jpg`,
    );

    return {
      alignedFile,
      ok: true,
      score: typeof res.ecc === "number" ? res.ecc : 0,
    };
  } catch {
    return {
      alignedFile: fallbackFile(afterBlob),
      ok: false,
      score: 0,
      message: WARN,
    };
  }
}

/** Direct access to UMD EccAlign.eccAlign for demos / advanced callers. */
export async function eccAlign(
  before: CanvasImageSource,
  after: CanvasImageSource,
  opts?: {
    maxSide?: number;
    levels?: number;
    maxIter?: number;
    minEcc?: number;
  },
) {
  return EccAlign.eccAlign(before, after, opts);
}
