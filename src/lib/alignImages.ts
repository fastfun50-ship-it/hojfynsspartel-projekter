/**
 * On-device before/after align (similarity only: translate + small rotate + uniform scale).
 * No perspective warp. Output matches before pixel size so the slider does not jump.
 */
export type AlignResult = {
  alignedFile: File;
  ok: boolean;
  score: number;
  message?: string;
};

const MATCH_EDGE = 256;
const MAX_TX_FRAC = 0.16;
const MAX_TY_FRAC = 0.16;
const MAX_ROT_DEG = 3.5;
const MAX_SCALE_DELTA = 0.05;
const SCORE_OK = 0.2;
const WARN = "kunne ikke låse helt — tag evt. om";

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

function toGray(
  img: CanvasImageSource,
  sw: number,
  sh: number,
  dw: number,
  dh: number,
): Float32Array {
  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas ikke tilgængelig");
  ctx.drawImage(img, 0, 0, sw, sh, 0, 0, dw, dh);
  const { data } = ctx.getImageData(0, 0, dw, dh);
  const gray = new Float32Array(dw * dh);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return gray;
}

/** Map before-pixel → after-pixel under similarity; bilinear sample. Missing = -1. */
function sampleWarped(
  src: Float32Array,
  sw: number,
  sh: number,
  dw: number,
  dh: number,
  cx: number,
  cy: number,
  scale: number,
  rotRad: number,
  tx: number,
  ty: number,
): Float32Array {
  const out = new Float32Array(dw * dh);
  const cos = Math.cos(rotRad);
  const sin = Math.sin(rotRad);
  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      const dx = x - cx + tx;
      const dy = y - cy + ty;
      const sx = cx + (cos * dx - sin * dy) / scale;
      const sy = cy + (sin * dx + cos * dy) / scale;
      if (sx < 0 || sy < 0 || sx >= sw - 1 || sy >= sh - 1) {
        out[y * dw + x] = -1;
        continue;
      }
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const fx = sx - x0;
      const fy = sy - y0;
      const i00 = src[y0 * sw + x0];
      const i10 = src[y0 * sw + x0 + 1];
      const i01 = src[(y0 + 1) * sw + x0];
      const i11 = src[(y0 + 1) * sw + x0 + 1];
      out[y * dw + x] =
        i00 * (1 - fx) * (1 - fy) +
        i10 * fx * (1 - fy) +
        i01 * (1 - fx) * fy +
        i11 * fx * fy;
    }
  }
  return out;
}

function nccScore(a: Float32Array, b: Float32Array): number {
  let n = 0;
  let sumA = 0;
  let sumB = 0;
  for (let i = 0; i < a.length; i++) {
    if (b[i] < 0) continue;
    sumA += a[i];
    sumB += b[i];
    n++;
  }
  if (n < a.length * 0.5) return -1;
  const meanA = sumA / n;
  const meanB = sumB / n;
  let num = 0;
  let denA = 0;
  let denB = 0;
  for (let i = 0; i < a.length; i++) {
    if (b[i] < 0) continue;
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    num += da * db;
    denA += da * da;
    denB += db * db;
  }
  const den = Math.sqrt(denA * denB);
  if (den < 1e-6) return -1;
  return num / den;
}

type Params = { tx: number; ty: number; rot: number; scale: number; score: number };

function searchAlign(before: Float32Array, after: Float32Array, w: number, h: number): Params {
  const cx = w / 2;
  const cy = h / 2;
  let best: Params = { tx: 0, ty: 0, rot: 0, scale: 1, score: -1 };
  const maxTx = Math.round(w * MAX_TX_FRAC);
  const maxTy = Math.round(h * MAX_TY_FRAC);

  for (let ty = -maxTy; ty <= maxTy; ty += 4) {
    for (let tx = -maxTx; tx <= maxTx; tx += 4) {
      const warped = sampleWarped(after, w, h, w, h, cx, cy, 1, 0, tx, ty);
      const score = nccScore(before, warped);
      if (score > best.score) best = { tx, ty, rot: 0, scale: 1, score };
    }
  }

  const coarse = { ...best };
  for (let ty = coarse.ty - 3; ty <= coarse.ty + 3; ty++) {
    for (let tx = coarse.tx - 3; tx <= coarse.tx + 3; tx++) {
      const warped = sampleWarped(after, w, h, w, h, cx, cy, 1, 0, tx, ty);
      const score = nccScore(before, warped);
      if (score > best.score) best = { tx, ty, rot: 0, scale: 1, score };
    }
  }

  const tBest = { ...best };
  for (let rotDeg = -MAX_ROT_DEG; rotDeg <= MAX_ROT_DEG; rotDeg += 1) {
    for (
      let scale = 1 - MAX_SCALE_DELTA;
      scale <= 1 + MAX_SCALE_DELTA + 1e-9;
      scale += 0.025
    ) {
      const rot = (rotDeg * Math.PI) / 180;
      const warped = sampleWarped(
        after,
        w,
        h,
        w,
        h,
        cx,
        cy,
        scale,
        rot,
        tBest.tx,
        tBest.ty,
      );
      const score = nccScore(before, warped);
      if (score > best.score) {
        best = { tx: tBest.tx, ty: tBest.ty, rot, scale, score };
      }
    }
  }

  return best;
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
 * Align after to before. Result matches before pixel size (slider-stable).
 * Always returns a file; ok=false when match confidence is low.
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
    const bw = beforeImg.naturalWidth || beforeImg.width;
    const bh = beforeImg.naturalHeight || beforeImg.height;
    const aw = afterImg.naturalWidth || afterImg.width;
    const ah = afterImg.naturalHeight || afterImg.height;
    if (!bw || !bh || !aw || !ah) {
      return { alignedFile: fallbackFile(afterBlob), ok: false, score: 0, message: WARN };
    }

    const matchScale = Math.min(1, MATCH_EDGE / Math.max(bw, bh));
    const mw = Math.max(48, Math.round(bw * matchScale));
    const mh = Math.max(48, Math.round(bh * matchScale));

    const beforeGray = toGray(beforeImg, bw, bh, mw, mh);

    // Letterbox after into before frame at match size
    const matchAfter = document.createElement("canvas");
    matchAfter.width = mw;
    matchAfter.height = mh;
    const mctx = matchAfter.getContext("2d");
    if (!mctx) throw new Error("Canvas ikke tilgængelig");
    const af = Math.min(mw / aw, mh / ah);
    const adw = Math.round(aw * af);
    const adh = Math.round(ah * af);
    const aox = Math.floor((mw - adw) / 2);
    const aoy = Math.floor((mh - adh) / 2);
    mctx.fillStyle = "#000";
    mctx.fillRect(0, 0, mw, mh);
    mctx.drawImage(afterImg, aox, aoy, adw, adh);
    const afterGray = toGray(matchAfter, mw, mh, mw, mh);

    const params = searchAlign(beforeGray, afterGray, mw, mh);
    const ok = params.score >= SCORE_OK;
    const ratio = bw / mw;

    // Full-res warp into before-sized canvas
    const full = document.createElement("canvas");
    full.width = bw;
    full.height = bh;
    const ctx = full.getContext("2d");
    if (!ctx) throw new Error("Canvas ikke tilgængelig");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, bw, bh);

    const cx = bw / 2;
    const cy = bh / 2;
    const tx = params.tx * ratio;
    const ty = params.ty * ratio;

    ctx.save();
    ctx.translate(cx - tx, cy - ty);
    ctx.rotate(-params.rot);
    ctx.scale(params.scale, params.scale);
    ctx.translate(-cx, -cy);
    const ff = Math.min(bw / aw, bh / ah);
    const fdw = Math.round(aw * ff);
    const fdh = Math.round(ah * ff);
    const fox = Math.floor((bw - fdw) / 2);
    const foy = Math.floor((bh - fdh) / 2);
    ctx.drawImage(afterImg, fox, foy, fdw, fdh);
    ctx.restore();

    // Keep exact before pixel size so slider edges do not jump.
    const alignedFile = await canvasToJpegFile(full, `efter-aligned-${Date.now()}.jpg`);
    return {
      alignedFile,
      ok,
      score: params.score,
      message: ok ? undefined : WARN,
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
