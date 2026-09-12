/**
 * ECC image alignment (Enhanced Correlation Coefficient)
 * Evangelidis & Psarakis — OpenCV findTransformECC-style.
 *
 * Motion: similarity = translation + rotation + uniform scale (4 DOF).
 * No perspective warp. Overlay/HUD must never be baked into source pixels.
 *
 * Usage (browser):
 *   const { alignedCanvas, warp, ecc, ok } = await eccAlign(beforeImg, afterImg, opts)
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.EccAlign = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }

  function grayFromImageData(data, w, h) {
    const g = new Float32Array(w * h);
    for (let i = 0, p = 0; i < data.length; i += 4, p++) {
      g[p] = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
    }
    return g;
  }

  function imageToGray(img, maxSide) {
    const sw = img.naturalWidth || img.width;
    const sh = img.naturalHeight || img.height;
    const scale = Math.min(1, maxSide / Math.max(sw, sh));
    const w = Math.max(16, Math.round(sw * scale));
    const h = Math.max(16, Math.round(sh * scale));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, 0, 0, w, h);
    const id = ctx.getImageData(0, 0, w, h);
    return { gray: grayFromImageData(id.data, w, h), w, h, scale, canvas: c };
  }

  function boxBlur(src, w, h, r) {
    if (r <= 0) return src;
    const tmp = new Float32Array(w * h);
    const dst = new Float32Array(w * h);
    const iW = 1 / (2 * r + 1);
    for (let y = 0; y < h; y++) {
      let acc = 0;
      const row = y * w;
      for (let x = -r; x <= r; x++) acc += src[row + clamp(x, 0, w - 1)];
      for (let x = 0; x < w; x++) {
        tmp[row + x] = acc * iW;
        acc += src[row + clamp(x + r + 1, 0, w - 1)] - src[row + clamp(x - r, 0, w - 1)];
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += tmp[clamp(y, 0, h - 1) * w + x];
      for (let y = 0; y < h; y++) {
        dst[y * w + x] = acc * iW;
        acc += tmp[clamp(y + r + 1, 0, h - 1) * w + x] - tmp[clamp(y - r, 0, h - 1) * w + x];
      }
    }
    return dst;
  }

  function downsample2(src, w, h) {
    const nw = w >> 1;
    const nh = h >> 1;
    const dst = new Float32Array(nw * nh);
    for (let y = 0; y < nh; y++) {
      for (let x = 0; x < nw; x++) {
        const i = (y * 2) * w + x * 2;
        dst[y * nw + x] = (src[i] + src[i + 1] + src[i + w] + src[i + w + 1]) * 0.25;
      }
    }
    return { gray: dst, w: nw, h: nh };
  }

  function buildPyramid(gray, w, h, levels) {
    const pyr = [{ gray, w, h }];
    for (let i = 1; i < levels; i++) {
      const prev = pyr[i - 1];
      if (prev.w < 40 || prev.h < 40) break;
      pyr.push(downsample2(prev.gray, prev.w, prev.h));
    }
    return pyr;
  }

  /** Similarity warp: [sx*cos -sy*sin tx; sx*sin sy*cos ty] with sx=sy=s */
  function warpParams(p) {
    const s = p[0];
    const th = p[1];
    const c = Math.cos(th);
    const si = Math.sin(th);
    return { a: s * c, b: -s * si, tx: p[2], c: s * si, d: s * c, ty: p[3] };
  }

  function sampleBilinear(img, w, h, x, y) {
    if (x < 0 || y < 0 || x >= w - 1 || y >= h - 1) return null;
    const x0 = x | 0;
    const y0 = y | 0;
    const fx = x - x0;
    const fy = y - y0;
    const i = y0 * w + x0;
    const v00 = img[i];
    const v10 = img[i + 1];
    const v01 = img[i + w];
    const v11 = img[i + w + 1];
    return v00 * (1 - fx) * (1 - fy) + v10 * fx * (1 - fy) + v01 * (1 - fx) * fy + v11 * fx * fy;
  }

  function warpImage(src, w, h, p) {
    const W = warpParams(p);
    const dst = new Float32Array(w * h);
    const mask = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const xs = W.a * x + W.b * y + W.tx;
        const ys = W.c * x + W.d * y + W.ty;
        const v = sampleBilinear(src, w, h, xs, ys);
        const i = y * w + x;
        if (v == null) {
          dst[i] = 0;
          mask[i] = 0;
        } else {
          dst[i] = v;
          mask[i] = 1;
        }
      }
    }
    return { img: dst, mask };
  }

  function sobel(img, w, h) {
    const gx = new Float32Array(w * h);
    const gy = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        gx[i] =
          -img[i - w - 1] +
          img[i - w + 1] -
          2 * img[i - 1] +
          2 * img[i + 1] -
          img[i + w - 1] +
          img[i + w + 1];
        gy[i] =
          -img[i - w - 1] -
          2 * img[i - w] -
          img[i - w + 1] +
          img[i + w - 1] +
          2 * img[i + w] +
          img[i + w + 1];
        gx[i] *= 0.125;
        gy[i] *= 0.125;
      }
    }
    return { gx, gy };
  }

  /**
   * One ECC iteration on similarity model.
   * Jacobian of warped coord wrt [s, theta, tx, ty] at pixel (x,y):
   * xs = s*cos*x - s*sin*y + tx
   * ys = s*sin*x + s*cos*y + ty
   */
  function eccIteration(templ, input, w, h, p) {
    const warped = warpImage(input, w, h, p);
    const { gx, gy } = sobel(warped.img, w, h);
    const Wp = warpParams(p);
    const s = p[0];
    const th = p[1];
    const cos = Math.cos(th);
    const sin = Math.sin(th);

    const n = 4;
    const H = new Float64Array(n * n);
    const b = new Float64Array(n);

    let sumT = 0;
    let sumI = 0;
    let sumTT = 0;
    let sumII = 0;
    let sumTI = 0;
    let count = 0;

    const valid = [];
    for (let y = 2; y < h - 2; y++) {
      for (let x = 2; x < w - 2; x++) {
        const i = y * w + x;
        if (!warped.mask[i]) continue;
        const T = templ[i];
        const I = warped.img[i];
        valid.push(i, x, y, T, I);
        sumT += T;
        sumI += I;
        sumTT += T * T;
        sumII += I * I;
        sumTI += T * I;
        count++;
      }
    }
    if (count < 64) return { p, ecc: 0, ok: false };

    const meanT = sumT / count;
    const meanI = sumI / count;
    const varT = sumTT - (sumT * sumT) / count;
    const varI = sumII - (sumI * sumI) / count;
    const cov = sumTI - (sumT * sumI) / count;
    const den = Math.sqrt(Math.max(varT, 1e-12) * Math.max(varI, 1e-12));
    const ecc = den > 0 ? cov / den : 0;

    for (let k = 0; k < valid.length; k += 5) {
      const i = valid[k];
      const x = valid[k + 1];
      const y = valid[k + 2];
      const T = valid[k + 3] - meanT;
      const I = valid[k + 4] - meanI;
      const ix = gx[i];
      const iy = gy[i];

      const dXs = cos * x - sin * y;
      const dYs = sin * x + cos * y;
      const dXth = -s * sin * x - s * cos * y;
      const dYth = s * cos * x - s * sin * y;

      const J0 = ix * dXs + iy * dYs;
      const J1 = ix * dXth + iy * dYth;
      const J2 = ix;
      const J3 = iy;
      const J = [J0, J1, J2, J3];
      const err = T - I;
      for (let r = 0; r < 4; r++) {
        b[r] += J[r] * err;
        for (let c = 0; c < 4; c++) H[r * 4 + c] += J[r] * J[c];
      }
    }

    const dp = solve4(H, b);
    if (!dp) return { p, ecc, ok: false };

    const next = [p[0] + dp[0], p[1] + dp[1], p[2] + dp[2], p[3] + dp[3]];
    next[0] = clamp(next[0], 0.85, 1.18);
    next[1] = clamp(next[1], -0.12, 0.12);
    return { p: next, ecc, ok: true, count };
  }

  function solve4(H, b) {
    const A = [];
    for (let i = 0; i < 4; i++) {
      A[i] = [H[i * 4], H[i * 4 + 1], H[i * 4 + 2], H[i * 4 + 3], b[i]];
    }
    for (let col = 0; col < 4; col++) {
      let piv = col;
      for (let r = col + 1; r < 4; r++) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
      if (Math.abs(A[piv][col]) < 1e-12) return null;
      if (piv !== col) {
        const t = A[col];
        A[col] = A[piv];
        A[piv] = t;
      }
      const div = A[col][col];
      for (let c = col; c < 5; c++) A[col][c] /= div;
      for (let r = 0; r < 4; r++) {
        if (r === col) continue;
        const f = A[r][col];
        for (let c = col; c < 5; c++) A[r][c] -= f * A[col][c];
      }
    }
    return [A[0][4], A[1][4], A[2][4], A[3][4]];
  }

  function identityParams() {
    return [1, 0, 0, 0];
  }

  function scaleParamsToLevel(p, factor) {
    return [p[0], p[1], p[2] * factor, p[3] * factor];
  }

  function runEcc(templPyr, inputPyr, opts) {
    const maxIter = opts.maxIter || 12;
    const eps = opts.eps || 1e-5;
    let p = identityParams();
    let lastEcc = 0;
    let ok = false;

    for (let lvl = templPyr.length - 1; lvl >= 0; lvl--) {
      const T = templPyr[lvl];
      const I = inputPyr[lvl];
      if (T.w !== I.w || T.h !== I.h) continue;
      if (lvl === templPyr.length - 1) p = identityParams();
      else {
        const prev = templPyr[lvl + 1];
        const fac = T.w / prev.w;
        p = scaleParamsToLevel(p, fac);
      }
      const tBlur = boxBlur(T.gray, T.w, T.h, 1);
      const iBlur = boxBlur(I.gray, I.w, I.h, 1);
      for (let it = 0; it < maxIter; it++) {
        const r = eccIteration(tBlur, iBlur, T.w, T.h, p);
        ok = r.ok;
        lastEcc = r.ecc;
        if (!r.ok) break;
        const ds = Math.abs(r.p[0] - p[0]);
        const dth = Math.abs(r.p[1] - p[1]);
        const dtx = Math.abs(r.p[2] - p[2]);
        const dty = Math.abs(r.p[3] - p[3]);
        p = r.p;
        if (ds + dth + dtx + dty < eps) break;
      }
    }
    return { p, ecc: lastEcc, ok };
  }

  function applyWarpToCanvas(srcImg, pWork, workW, workH, fullW, fullH) {
    const sx = fullW / workW;
    const sy = fullH / workH;
    const W = warpParams(pWork);
    const a = W.a;
    const b = W.b * (workW / workH) * (fullH / fullW);
    const c = W.c * (workH / workW) * (fullW / fullH);
    const d = W.d;
    const tx = W.tx * sx;
    const ty = W.ty * sy;

    const canvas = document.createElement("canvas");
    canvas.width = fullW;
    canvas.height = fullH;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(a, c, b, d, tx, ty);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(srcImg, 0, 0, fullW, fullH);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    return canvas;
  }

  /**
   * Align `after` onto `before` (template = before).
   * @param {CanvasImageSource} before
   * @param {CanvasImageSource} after
   * @param {{maxSide?:number, levels?:number, maxIter?:number, minEcc?:number}} [opts]
   */
  async function eccAlign(before, after, opts) {
    opts = opts || {};
    const maxSide = opts.maxSide || 480;
    const levels = opts.levels || 4;
    const minEcc = opts.minEcc == null ? 0.35 : opts.minEcc;

    const t = imageToGray(before, maxSide);
    const i = imageToGray(after, maxSide);
    const tw = Math.min(t.w, i.w);
    const th = Math.min(t.h, i.h);

    function crop(src, w0, h0, w, h) {
      const out = new Float32Array(w * h);
      for (let y = 0; y < h; y++) out.set(src.subarray(y * w0, y * w0 + w), y * w);
      return out;
    }

    const tGray = crop(t.gray, t.w, t.h, tw, th);
    const iGray = crop(i.gray, i.w, i.h, tw, th);
    const tPyr = buildPyramid(tGray, tw, th, levels);
    const iPyr = buildPyramid(iGray, tw, th, levels);

    const result = runEcc(tPyr, iPyr, opts);
    const ok = result.ok && result.ecc >= minEcc;

    const fullW = before.naturalWidth || before.width;
    const fullH = before.naturalHeight || before.height;
    const alignedCanvas = applyWarpToCanvas(after, result.p, tw, th, fullW, fullH);

    return {
      ok,
      ecc: result.ecc,
      warp: {
        scale: result.p[0],
        rotationRad: result.p[1],
        rotationDeg: (result.p[1] * 180) / Math.PI,
        tx: result.p[2] * (fullW / tw),
        ty: result.p[3] * (fullH / th),
      },
      alignedCanvas,
      workSize: { w: tw, h: th },
    };
  }

  return { eccAlign, warpParams };
});
