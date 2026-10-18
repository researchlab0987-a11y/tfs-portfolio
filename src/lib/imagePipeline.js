'use client';
/**
 * Image pipeline for the editor: decode -> rotate/flip/crop -> downscale ->
 * encode -> store.
 *
 * Downscaling keeps quality in two steps:
 *   1. exact 2:1 halvings on a canvas (a true box average, very clean) until
 *      the picture is less than twice the target size;
 *   2. a final Lanczos-3 pass in linear light (lib/imageResize.js), run in a
 *      Web Worker, plus a light sharpening.
 * Encoding prefers WebP (much smaller than JPEG at the same visual quality)
 * and, when a byte budget is set, searches for the highest quality that fits.
 *
 * Storage: Cloudinary when it is configured, otherwise the compressed image
 * is stored inline as a data URL inside the site data.
 */
import { uploadImage, uploadsEnabled } from './cloudinary';
import { resizeJob } from './imageResize';

/** Budget for images stored inline (Firestore documents max out at 1 MB). */
export const INLINE_LIMIT = 220 * 1024;
export const MAX_INPUT = 60 * 1024 * 1024;
const MAX_CANVAS_AREA = 16_000_000; // iOS Safari's canvas limit is ~16.7 MP

export const SIZE_OPTIONS = [
  { value: 800, label: 'Small', help: 'Logos, icons, thumbnails' },
  { value: 1200, label: 'Medium', help: 'Cards and side photos' },
  { value: 1600, label: 'Large', help: 'Most photos' },
  { value: 2400, label: 'Extra large', help: 'Full-width banners' },
  { value: 0, label: 'Original', help: 'No resizing' },
];

export const defaultOutput = () => ({
  maxSide: 1600,
  format: 'auto',
  quality: 0.88,
  maxBytes: uploadsEnabled ? null : INLINE_LIMIT,
  sharpen: 0.3,
});

export function formatBytes(b) {
  if (b == null) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b / 1024).toFixed(b < 10240 ? 1 : 0)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

/** Animated GIFs and SVGs are stored as they are; re-encoding would break them. */
export const isPassthrough = (type) => /image\/(gif|svg\+xml)/.test(type || '');

/* ------------------------------------------------------------------ */
/* Decoding                                                            */
/* ------------------------------------------------------------------ */

export async function decodeImage(blob) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' });
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close?.() };
    } catch {
      // Fall through to <img>, which decodes a few more formats on some browsers.
    }
  }
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  try {
    await img.decode();
  } catch {
    URL.revokeObjectURL(url);
    throw new Error('This file could not be opened as an image.');
  }
  return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
}

export async function blobFromUrl(url) {
  let res;
  try {
    res = await fetch(url, { mode: 'cors' });
  } catch {
    throw new Error('That image’s website does not allow editing it here. Download it and drop the file instead.');
  }
  if (!res.ok) throw new Error(`Could not load the image (${res.status}).`);
  const blob = await res.blob();
  if (!blob.type.startsWith('image/')) throw new Error('That link is not an image.');
  return blob;
}

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

export const rotatedSize = (w, h, rot) => (rot % 180 ? [h, w] : [w, h]);

/** Draw the whole image rotated (multiples of 90°) and optionally mirrored. */
export function drawTransformed(ctx, img, rot, flip) {
  const [RW, RH] = rotatedSize(img.width, img.height, rot);
  ctx.translate(RW / 2, RH / 2);
  if (flip) ctx.scale(-1, 1);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.drawImage(img.source, -img.width / 2, -img.height / 2, img.width, img.height);
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

function context(c) {
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  return ctx;
}

/** Largest crop of the given aspect (w/h), centred. aspect null = whole image. */
export function centeredCrop(RW, RH, aspect) {
  if (!aspect) return { x: 0, y: 0, w: RW, h: RH };
  let w = RW;
  let h = w / aspect;
  if (h > RH) {
    h = RH;
    w = h * aspect;
  }
  return { x: (RW - w) / 2, y: (RH - h) / 2, w, h };
}

/* ------------------------------------------------------------------ */
/* Resizing                                                            */
/* ------------------------------------------------------------------ */

let worker;
let seq = 0;
const pending = new Map();

function getWorker() {
  if (worker !== undefined) return worker;
  try {
    worker = new Worker(new URL('./image.worker.js', import.meta.url));
    worker.onmessage = (e) => {
      const p = pending.get(e.data.id);
      if (!p) return;
      pending.delete(e.data.id);
      if (e.data.error) p.reject(new Error(e.data.error));
      else p.resolve(e.data.out);
    };
    worker.onerror = () => {
      pending.forEach((p) => p.reject(new Error('worker failed')));
      pending.clear();
      worker?.terminate();
      worker = null;
    };
  } catch {
    worker = null;
  }
  return worker;
}

async function resize(job) {
  const w = getWorker();
  if (w) {
    try {
      return await new Promise((resolve, reject) => {
        const id = ++seq;
        pending.set(id, { resolve, reject });
        w.postMessage({ id, job });
      });
    } catch {
      // Worker unavailable or out of memory: try on the main thread.
    }
  }
  return resizeJob(job);
}

/** Crop + transform at full resolution, then halve until < 2x the target. */
function stageOne(img, { rot, flip, crop }, target) {
  const areaCap = Math.sqrt(MAX_CANVAS_AREA / (crop.w * crop.h));
  let scale = Math.min(1, areaCap);
  let c = canvas(crop.w * scale, crop.h * scale);
  let ctx = context(c);
  ctx.scale(scale, scale);
  ctx.translate(-crop.x, -crop.y);
  drawTransformed(ctx, img, rot, flip);

  while (scale / 2 >= target) {
    const next = canvas(c.width / 2, c.height / 2);
    context(next).drawImage(c, 0, 0, next.width, next.height);
    c.width = 0; // free memory early
    c = next;
    scale /= 2;
  }
  return c;
}

function hasAlpha(data) {
  for (let i = 3; i < data.length; i += 16) if (data[i] < 250) return true;
  return false;
}

const WEBP = 'image/webp';
const JPEG = 'image/jpeg';
const PNG = 'image/png';

function toBlob(c, type, q) {
  return new Promise((resolve) => c.toBlob(resolve, type, q));
}

async function encode(c, type, q) {
  const blob = await toBlob(c, type, q);
  // Browsers that cannot write WebP silently return PNG; detect that.
  return blob && blob.type === type ? blob : null;
}

/** Highest quality in [lo, hi] whose output fits in maxBytes. */
async function fitQuality(c, type, hi, maxBytes) {
  let best = await encode(c, type, hi);
  if (!best || !maxBytes || best.size <= maxBytes) return { blob: best, q: hi };
  let lo = 0.5;
  let top = hi;
  let found = null;
  for (let i = 0; i < 7; i++) {
    const mid = (lo + top) / 2;
    const b = await encode(c, type, mid);
    if (b && b.size <= maxBytes) {
      found = { blob: b, q: mid };
      lo = mid;
    } else top = mid;
  }
  if (found) return found;
  best = await encode(c, type, 0.5);
  return { blob: best, q: 0.5, over: true };
}

/**
 * Produce the final image.
 * edit:   { rot, flip, crop: {x, y, w, h} in rotated-image pixels }
 * output: { maxSide, format: auto|webp|jpeg|png, quality 0..1, maxBytes, sharpen }
 */
export async function processImage(img, edit, output) {
  const { maxSide, format = 'auto', quality = 0.88, maxBytes, sharpen = 0.3 } = output;
  const { crop } = edit;
  const long = Math.max(crop.w, crop.h);
  const target = maxSide ? Math.min(1, maxSide / long) : 1;
  const dw = Math.max(1, Math.round(crop.w * target));
  const dh = Math.max(1, Math.round(crop.h * target));

  const mid = stageOne(img, edit, target);
  let out = mid;
  if (mid.width !== dw || mid.height !== dh) {
    const data = context(mid).getImageData(0, 0, mid.width, mid.height).data;
    const px = await resize({ data, width: mid.width, height: mid.height, dw, dh, sharpenAmount: sharpen });
    out = canvas(dw, dh);
    context(out).putImageData(new ImageData(px, dw, dh), 0, 0);
    mid.width = 0;
  }

  const alpha = hasAlpha(context(out).getImageData(0, 0, dw, dh).data);

  // Order of formats to try.
  const wants = {
    auto: alpha ? [WEBP, PNG] : [WEBP, JPEG],
    webp: [WEBP, alpha ? PNG : JPEG],
    jpeg: [JPEG],
    png: [PNG, WEBP],
  }[format] || [WEBP, JPEG];

  let result = null;
  for (const type of wants) {
    if (type === JPEG && alpha) {
      // JPEG has no transparency: put the image on white.
      const flat = canvas(dw, dh);
      const fctx = context(flat);
      fctx.fillStyle = '#ffffff';
      fctx.fillRect(0, 0, dw, dh);
      fctx.drawImage(out, 0, 0);
      out = flat;
    }
    const r = type === PNG ? { blob: await encode(out, PNG), q: 1 } : await fitQuality(out, type, quality, maxBytes);
    if (!r.blob) continue;
    result = { ...r, type };
    if (!maxBytes || r.blob.size <= maxBytes) break;
  }
  if (!result) throw new Error('This browser could not save the image.');

  // Still over budget even at the lowest sensible quality: make it smaller.
  if (maxBytes && result.blob.size > maxBytes && Math.max(dw, dh) > 320) {
    return processImage(img, edit, { ...output, maxSide: Math.round(Math.max(dw, dh) * 0.82) });
  }

  out.width = 0;
  return { blob: result.blob, type: result.type, quality: result.q, width: dw, height: dh };
}

/* ------------------------------------------------------------------ */
/* Storing                                                             */
/* ------------------------------------------------------------------ */

export function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('Could not read the image.'));
    r.readAsDataURL(blob);
  });
}

const EXT = { [WEBP]: 'webp', [JPEG]: 'jpg', [PNG]: 'png', 'image/gif': 'gif', 'image/svg+xml': 'svg' };

export function outputName(name, type) {
  const base = String(name || 'image').replace(/\.[a-z0-9]+$/i, '').replace(/[^\w.-]+/g, '-').slice(0, 60) || 'image';
  return `${base}.${EXT[type] || 'img'}`;
}

/** Upload to Cloudinary, or inline as a data URL when no host is set up. */
export async function storeImage(blob, name, onProgress) {
  if (uploadsEnabled) return uploadImage(blob, onProgress, outputName(name, blob.type));
  if (blob.size > INLINE_LIMIT * 1.5) {
    throw new Error(`This image is ${formatBytes(blob.size)}. Without an image host, images must be under ${formatBytes(INLINE_LIMIT)}.`);
  }
  return blobToDataURL(blob);
}

/** One-step path with default settings (used for multi-photo drops). */
export async function prepareAndStore(file, onProgress) {
  if (!file?.type?.startsWith('image/')) throw new Error(`${file?.name || 'File'} is not an image.`);
  if (file.size > MAX_INPUT) throw new Error(`${file.name} is larger than ${formatBytes(MAX_INPUT)}.`);
  if (isPassthrough(file.type)) return { url: await storeImage(file, file.name, onProgress), before: file.size, after: file.size };
  const img = await decodeImage(file);
  try {
    const result = await processImage(img, { rot: 0, flip: false, crop: { x: 0, y: 0, w: img.width, h: img.height } }, defaultOutput());
    const url = await storeImage(result.blob, file.name, onProgress);
    return { url, before: file.size, after: result.blob.size };
  } finally {
    img.close();
  }
}

/** First image file in a drop or paste, plus any dropped link. */
export function readTransfer(dt) {
  const files = Array.from(dt?.files || []).filter((f) => f.type.startsWith('image/'));
  if (!files.length && dt?.items) {
    for (const it of dt.items) {
      if (it.kind === 'file' && it.type.startsWith('image/')) {
        const f = it.getAsFile();
        if (f) files.push(f);
      }
    }
  }
  let url = null;
  if (!files.length) {
    const text = dt?.getData?.('text/uri-list') || dt?.getData?.('text/plain') || '';
    const first = text.split(/\r?\n/).find((l) => l && !l.startsWith('#'))?.trim();
    if (first && /^(https?:|data:image\/)/i.test(first)) url = first;
  }
  return { files, url };
}
