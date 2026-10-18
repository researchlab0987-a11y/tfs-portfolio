/**
 * High-quality image downscaling, independent of the DOM so it can run in a
 * Web Worker.
 *
 *  - Lanczos-3 resampling, separable (horizontal pass, then vertical).
 *  - Done in linear light with premultiplied alpha, so fine detail, hair and
 *    text do not go dark or muddy and transparent edges do not get halos.
 *  - An optional light unsharp mask restores the crispness every downscale
 *    loses.
 *
 * Input and output are plain RGBA byte arrays (ImageData.data).
 */

const TO_LIN = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  TO_LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

// Linear -> sRGB through a fine table; 65536 steps keeps shadows free of banding.
const LUT_N = 65535;
let TO_SRGB = null;
function srgbTable() {
  if (TO_SRGB) return TO_SRGB;
  TO_SRGB = new Uint8Array(LUT_N + 1);
  for (let i = 0; i <= LUT_N; i++) {
    const l = i / LUT_N;
    const s = l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055;
    TO_SRGB[i] = Math.round(Math.min(1, Math.max(0, s)) * 255);
  }
  return TO_SRGB;
}

function lanczos3(x) {
  if (x === 0) return 1;
  if (x <= -3 || x >= 3) return 0;
  const px = Math.PI * x;
  return (3 * Math.sin(px) * Math.sin(px / 3)) / (px * px);
}

function weights(src, dst) {
  const scale = dst / src;
  const fs = scale < 1 ? 1 / scale : 1; // widen the kernel when shrinking
  const support = 3 * fs;
  const taps = Math.ceil(support * 2) + 2;
  const starts = new Int32Array(dst);
  const lens = new Int32Array(dst);
  const w = new Float32Array(dst * taps);
  for (let i = 0; i < dst; i++) {
    const center = (i + 0.5) / scale - 0.5;
    const left = Math.max(0, Math.ceil(center - support));
    const right = Math.min(src - 1, Math.floor(center + support));
    let sum = 0;
    let n = 0;
    for (let j = left; j <= right && n < taps; j++, n++) {
      const v = lanczos3((j - center) / fs);
      w[i * taps + n] = v;
      sum += v;
    }
    if (sum !== 0) for (let k = 0; k < n; k++) w[i * taps + k] /= sum;
    starts[i] = left;
    lens[i] = n;
  }
  return { starts, lens, w, taps };
}

/** Resize RGBA bytes from W x H to dw x dh. Returns a Uint8ClampedArray. */
export function lanczosResize(src, W, H, dw, dh) {
  const lut = srgbTable();
  const hx = weights(W, dw);
  const vy = weights(H, dh);

  // Horizontal: sRGB bytes -> linear, premultiplied floats.
  const tmp = new Float32Array(dw * H * 4);
  for (let y = 0; y < H; y++) {
    const row = y * W * 4;
    const orow = y * dw * 4;
    for (let i = 0; i < dw; i++) {
      const n = hx.lens[i];
      const wo = i * hx.taps;
      let p = row + hx.starts[i] * 4;
      let r = 0, g = 0, b = 0, a = 0;
      for (let j = 0; j < n; j++, p += 4) {
        const wa = hx.w[wo + j] * src[p + 3] * (1 / 255);
        r += TO_LIN[src[p]] * wa;
        g += TO_LIN[src[p + 1]] * wa;
        b += TO_LIN[src[p + 2]] * wa;
        a += wa;
      }
      const o = orow + i * 4;
      tmp[o] = r;
      tmp[o + 1] = g;
      tmp[o + 2] = b;
      tmp[o + 3] = a;
    }
  }

  // Vertical: floats -> un-premultiplied sRGB bytes.
  const out = new Uint8ClampedArray(dw * dh * 4);
  const rowLen = dw * 4;
  for (let y = 0; y < dh; y++) {
    const n = vy.lens[y];
    const wo = y * vy.taps;
    const s = vy.starts[y];
    const orow = y * rowLen;
    for (let i = 0; i < dw; i++) {
      let p = s * rowLen + i * 4;
      let r = 0, g = 0, b = 0, a = 0;
      for (let j = 0; j < n; j++, p += rowLen) {
        const wt = vy.w[wo + j];
        r += tmp[p] * wt;
        g += tmp[p + 1] * wt;
        b += tmp[p + 2] * wt;
        a += tmp[p + 3] * wt;
      }
      const o = orow + i * 4;
      if (a <= 0.0005) {
        out[o] = out[o + 1] = out[o + 2] = out[o + 3] = 0;
        continue;
      }
      const ia = 1 / a;
      out[o] = lut[Math.round(Math.min(1, Math.max(0, r * ia)) * LUT_N)];
      out[o + 1] = lut[Math.round(Math.min(1, Math.max(0, g * ia)) * LUT_N)];
      out[o + 2] = lut[Math.round(Math.min(1, Math.max(0, b * ia)) * LUT_N)];
      out[o + 3] = Math.round(Math.min(1, a) * 255);
    }
  }
  return out;
}

/** Light unsharp mask (3x3 Gaussian), in place on RGB. amount 0..1. */
export function sharpen(px, w, h, amount) {
  if (!amount || w < 3 || h < 3) return px;
  const src = new Uint8ClampedArray(px);
  const row = w * 4;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const o = y * row + x * 4;
      for (let c = 0; c < 3; c++) {
        const i = o + c;
        const blur =
          (src[i - row - 4] + 2 * src[i - row] + src[i - row + 4] +
            2 * src[i - 4] + 4 * src[i] + 2 * src[i + 4] +
            src[i + row - 4] + 2 * src[i + row] + src[i + row + 4]) / 16;
        px[i] = src[i] + amount * (src[i] - blur);
      }
    }
  }
  return px;
}

/** Full job used by the worker and by the main-thread fallback. */
export function resizeJob({ data, width, height, dw, dh, sharpenAmount }) {
  const out = dw === width && dh === height ? new Uint8ClampedArray(data) : lanczosResize(data, width, height, dw, dh);
  if (sharpenAmount && (dw < width || dh < height)) sharpen(out, dw, dh, sharpenAmount);
  return out;
}
