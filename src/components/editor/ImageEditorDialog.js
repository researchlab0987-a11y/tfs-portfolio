'use client';
/**
 * Crop, rotate and resize an image before it is saved.
 *
 * The crop frame is dragged with mouse or touch (move it, or pull a corner);
 * arrow keys nudge it. While you work, the final file is produced in the
 * background so the size shown is the real one and Save is instant.
 */
import Modal from '@/components/ui/Modal';
import {
  centeredCrop,
  decodeImage,
  defaultOutput,
  drawTransformed,
  formatBytes,
  processImage,
  rotatedSize,
  SIZE_OPTIONS,
} from '@/lib/imagePipeline';
import { uploadsEnabled } from '@/lib/cloudinary';
import { cx } from '@/lib/utils';
import { FlipHorizontal2, Loader2, RotateCcw, RotateCw, Undo2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const ASPECTS = [
  { key: 'free', label: 'Free', value: null },
  { key: 'original', label: 'Original', value: 'original' },
  { key: '1:1', label: 'Square', value: 1 },
  { key: '4:5', label: '4:5', value: 4 / 5 },
  { key: '3:4', label: '3:4', value: 3 / 4 },
  { key: '4:3', label: '4:3', value: 4 / 3 },
  { key: '3:2', label: '3:2', value: 3 / 2 },
  { key: '16:9', label: '16:9', value: 16 / 9 },
];

const FORMATS = [
  { value: 'auto', label: 'Best' },
  { value: 'webp', label: 'WebP' },
  { value: 'jpeg', label: 'JPG' },
  { value: 'png', label: 'PNG' },
];

const HANDLES = ['tl', 'tr', 'bl', 'br'];

function aspectValue(key, RW, RH) {
  const a = ASPECTS.find((x) => x.key === key)?.value;
  return a === 'original' ? RW / RH : a || null;
}

function resizeCrop(c, mode, dx, dy, aspect, RW, RH, min) {
  const left = mode.includes('l');
  const top = mode.includes('t');
  const ax = left ? c.x + c.w : c.x;
  const ay = top ? c.y + c.h : c.y;
  let w = Math.max(min, left ? c.w - dx : c.w + dx);
  let h = Math.max(min, top ? c.h - dy : c.h + dy);
  if (aspect) {
    if (w / h > aspect) h = w / aspect;
    else w = h * aspect;
  }
  const maxW = left ? ax : RW - ax;
  const maxH = top ? ay : RH - ay;
  if (w > maxW) {
    w = maxW;
    if (aspect) h = w / aspect;
  }
  if (h > maxH) {
    h = maxH;
    if (aspect) w = h * aspect;
  }
  return { x: left ? ax - w : ax, y: top ? ay - h : ay, w, h };
}

const editKey = (o) => JSON.stringify(o);

export default function ImageEditorDialog({ blob, name, onCancel, onSave, defaultAspect = 'original', defaultSize = 1600 }) {
  const [img, setImg] = useState(null);
  const [error, setError] = useState('');
  const [rot, setRot] = useState(0);
  const [flip, setFlip] = useState(false);
  const [aspectKey, setAspectKey] = useState(defaultAspect);
  const [crop, setCrop] = useState(null);
  const [size, setSize] = useState(defaultSize);
  const [format, setFormat] = useState('auto');
  const [quality, setQuality] = useState(88);
  const [result, setResult] = useState(null); // { key, ...processImage output }
  const [working, setWorking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [boxW, setBoxW] = useState(0);

  const boxRef = useRef(null);
  const canvasRef = useRef(null);
  const drag = useRef(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Decode once.
  useEffect(() => {
    let alive = true;
    let decoded = null;
    decodeImage(blob)
      .then((d) => {
        decoded = d;
        if (alive) setImg(d);
        else d.close();
      })
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
      decoded?.close();
    };
  }, [blob]);

  const [RW, RH] = img ? rotatedSize(img.width, img.height, rot) : [1, 1];
  const aspect = aspectValue(aspectKey, RW, RH);

  // New image or rotation: reset the frame for the current aspect.
  useEffect(() => {
    if (img) setCrop(centeredCrop(RW, RH, aspectValue(aspectKey, RW, RH)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img, rot]);

  // Measure the stage.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth));
    ro.observe(el);
    setBoxW(el.clientWidth);
    return () => ro.disconnect();
  }, [img]);

  const maxH = typeof window !== 'undefined' ? Math.min(window.innerHeight * 0.5, 460) : 400;
  const k = img && boxW ? Math.min(boxW / RW, maxH / RH) : 0;
  const viewW = Math.round(RW * k);
  const viewH = Math.round(RH * k);

  // Preview canvas.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !img || !k) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(viewW * dpr);
    c.height = Math.round(viewH * dpr);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.setTransform(k * dpr, 0, 0, k * dpr, 0, 0);
    drawTransformed(ctx, img, rot, flip);
  }, [img, rot, flip, k, viewW, viewH]);

  const output = useMemo(
    () => ({ ...defaultOutput(), maxSide: size, format, quality: quality / 100 }),
    [size, format, quality]
  );
  const key = crop ? editKey({ rot, flip, crop: [crop.x, crop.y, crop.w, crop.h].map(Math.round), output }) : '';

  // Produce the real file in the background, shortly after the last change.
  useEffect(() => {
    if (!img || !crop) return undefined;
    let alive = true;
    const t = setTimeout(async () => {
      setWorking(true);
      setError('');
      try {
        const r = await processImage(img, { rot, flip, crop }, output);
        if (alive) setResult({ key, ...r });
      } catch (e) {
        if (alive) setError(e.message);
      } finally {
        if (alive) setWorking(false);
      }
    }, 450);
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, img]);

  const chooseAspect = (k2) => {
    setAspectKey(k2);
    setCrop(centeredCrop(RW, RH, aspectValue(k2, RW, RH)));
  };

  const reset = () => {
    setRot(0);
    setFlip(false);
    setAspectKey(defaultAspect);
    if (img) setCrop(centeredCrop(img.width, img.height, aspectValue(defaultAspect, img.width, img.height)));
  };

  /* Dragging ------------------------------------------------------- */
  const onDown = (mode) => (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { mode, x: e.clientX, y: e.clientY, crop };
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d || !k) return;
    const dx = (e.clientX - d.x) / k;
    const dy = (e.clientY - d.y) / k;
    const c = d.crop;
    if (d.mode === 'move') {
      setCrop({ ...c, x: Math.min(Math.max(0, c.x + dx), RW - c.w), y: Math.min(Math.max(0, c.y + dy), RH - c.h) });
    } else {
      setCrop(resizeCrop(c, d.mode, dx, dy, aspect, RW, RH, Math.min(RW, RH, 28 / k)));
    }
  };
  const onUp = () => {
    drag.current = null;
  };

  const onKeyDown = (e) => {
    if (!crop) return;
    const step = (e.shiftKey ? 0.1 : 0.01) * Math.max(RW, RH);
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    setCrop((c) => ({ ...c, x: Math.min(Math.max(0, c.x + d[0]), RW - c.w), y: Math.min(Math.max(0, c.y + d[1]), RH - c.h) }));
  };

  const save = useCallback(async () => {
    if (!img || !crop) return;
    setSaving(true);
    try {
      const r = result?.key === key ? result : await processImage(img, { rot, flip, crop }, output);
      await onSave(r);
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }, [img, crop, result, key, rot, flip, output, onSave]);

  const ready = result?.key === key;
  const outW = crop ? Math.round(Math.min(crop.w, size ? (crop.w * size) / Math.max(crop.w, crop.h) : crop.w)) : 0;
  const outH = crop ? Math.round(Math.min(crop.h, size ? (crop.h * size) / Math.max(crop.w, crop.h) : crop.h)) : 0;
  const saved = ready && blob.size ? Math.round((1 - result.blob.size / blob.size) * 100) : null;
  const lossy = ready && result.type !== 'image/png';

  if (!mounted) return null;
  return createPortal(
    <Modal
      open
      onClose={saving ? undefined : onCancel}
      title="Crop and resize"
      size="lg"
      footer={
        <>
          <p className="mr-auto text-[12.5px] text-slate-600" aria-live="polite">
            {error ? (
              <span className="text-red-600">{error}</span>
            ) : ready ? (
              <>
                <b className="text-slate-900">
                  {result.width} × {result.height}
                </b>{' '}
                · {result.type.replace('image/', '').toUpperCase()} · <b className="text-slate-900">{formatBytes(result.blob.size)}</b>
                {saved > 0 && <span className="ml-1 rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700">−{saved}%</span>}
                {lossy && result.quality < 0.7 && <span className="ml-1 text-amber-600">Quality lowered to fit the size limit</span>}
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Loader2 size={13} className="animate-spin" /> Optimising…
              </span>
            )}
          </p>
          <button type="button" className="ui-btn" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="ui-btn ui-btn-accent" onClick={save} disabled={!img || saving}>
            {saving && <Loader2 size={14} className="animate-spin" />} {saving ? 'Saving…' : 'Use image'}
          </button>
        </>
      }
    >
      {!img && !error && (
        <div className="grid h-64 place-items-center text-slate-500">
          <Loader2 className="animate-spin" />
        </div>
      )}
      {!img && error && <p className="py-10 text-center text-red-600">{error}</p>}
      {img && (
        <div className="space-y-4">
          <div ref={boxRef} className="flex w-full justify-center rounded-xl bg-slate-800 p-3">
            {k > 0 && crop && (
              <div className="relative touch-none select-none overflow-hidden" style={{ width: viewW, height: viewH }} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
                <canvas ref={canvasRef} style={{ width: viewW, height: viewH }} className="block" />
                <div
                  role="group"
                  tabIndex={0}
                  aria-label="Crop area. Drag to move, drag a corner to resize, or use the arrow keys."
                  onPointerDown={onDown('move')}
                  onKeyDown={onKeyDown}
                  className="absolute cursor-move outline outline-2 outline-white focus-visible:outline-[3px] focus-visible:outline-amber-400"
                  style={{
                    left: crop.x * k,
                    top: crop.y * k,
                    width: crop.w * k,
                    height: crop.h * k,
                    boxShadow: '0 0 0 9999px rgba(15,23,42,.62)',
                    backgroundImage:
                      'linear-gradient(to right, transparent calc(33.333% - .5px), rgba(255,255,255,.5) calc(33.333% - .5px), rgba(255,255,255,.5) calc(33.333% + .5px), transparent calc(33.333% + .5px), transparent calc(66.666% - .5px), rgba(255,255,255,.5) calc(66.666% - .5px), rgba(255,255,255,.5) calc(66.666% + .5px), transparent calc(66.666% + .5px)), linear-gradient(to bottom, transparent calc(33.333% - .5px), rgba(255,255,255,.5) calc(33.333% - .5px), rgba(255,255,255,.5) calc(33.333% + .5px), transparent calc(33.333% + .5px), transparent calc(66.666% - .5px), rgba(255,255,255,.5) calc(66.666% - .5px), rgba(255,255,255,.5) calc(66.666% + .5px), transparent calc(66.666% + .5px))',
                  }}
                >
                  {HANDLES.map((h) => (
                    <span
                      key={h}
                      onPointerDown={onDown(h)}
                      className={cx(
                        'absolute h-7 w-7 touch-none',
                        h === 'tl' && '-left-2 -top-2 cursor-nwse-resize',
                        h === 'tr' && '-right-2 -top-2 cursor-nesw-resize',
                        h === 'bl' && '-bottom-2 -left-2 cursor-nesw-resize',
                        h === 'br' && '-bottom-2 -right-2 cursor-nwse-resize'
                      )}
                    >
                      <span
                        className={cx(
                          'absolute h-3.5 w-3.5 border-white',
                          h === 'tl' && 'left-2 top-2 border-l-[3px] border-t-[3px]',
                          h === 'tr' && 'right-2 top-2 border-r-[3px] border-t-[3px]',
                          h === 'bl' && 'bottom-2 left-2 border-b-[3px] border-l-[3px]',
                          h === 'br' && 'bottom-2 right-2 border-b-[3px] border-r-[3px]'
                        )}
                      />
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="ui-seg" role="group" aria-label="Crop shape">
              {ASPECTS.map((a) => (
                <button key={a.key} type="button" aria-pressed={aspectKey === a.key} onClick={() => chooseAspect(a.key)}>
                  {a.label}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-1">
              <button type="button" className="ui-icon-btn" onClick={() => setRot((r) => (r + 270) % 360)} title="Rotate left" aria-label="Rotate left">
                <RotateCcw size={16} />
              </button>
              <button type="button" className="ui-icon-btn" onClick={() => setRot((r) => (r + 90) % 360)} title="Rotate right" aria-label="Rotate right">
                <RotateCw size={16} />
              </button>
              <button type="button" className={cx('ui-icon-btn', flip && 'bg-slate-100')} onClick={() => setFlip((f) => !f)} title="Mirror" aria-label="Mirror" aria-pressed={flip}>
                <FlipHorizontal2 size={16} />
              </button>
              <button type="button" className="ui-icon-btn" onClick={reset} title="Undo all changes" aria-label="Reset">
                <Undo2 size={16} />
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div>
              <p className="ui-label">Size (longest side)</p>
              <div className="ui-seg" role="group" aria-label="Output size">
                {SIZE_OPTIONS.map((o) => (
                  <button key={o.value} type="button" aria-pressed={size === o.value} onClick={() => setSize(o.value)} title={o.help}>
                    {o.label}
                    {o.value ? <span className="ml-1 text-[11px] text-slate-400">{o.value}</span> : null}
                  </button>
                ))}
              </div>
              <p className="ui-help">
                Original {img.width} × {img.height} · {formatBytes(blob.size)} → {outW} × {outH} px. Photos are never enlarged.
              </p>
            </div>
            <div>
              <p className="ui-label">Format</p>
              <div className="ui-seg" role="group" aria-label="Format">
                {FORMATS.map((f) => (
                  <button key={f.value} type="button" aria-pressed={format === f.value} onClick={() => setFormat(f.value)}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {format !== 'png' && (
            <label className="flex items-center gap-3 text-[13px]">
              <span className="w-14 font-semibold text-slate-700">Quality</span>
              <input type="range" min={60} max={100} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="flex-1 accent-[#0d7a6f]" />
              <span className="w-10 text-right tabular-nums">{quality}%</span>
            </label>
          )}

          <p className="ui-help">
            Resized with Lanczos-3 in linear light and lightly sharpened, the method photo editors use, so the picture stays crisp while the file gets
            much smaller. {working && 'Updating…'}
            {!uploadsEnabled && ` No image host is set up, so the image is saved inside the site data and kept under ${formatBytes(defaultOutput().maxBytes)}.`}
          </p>
        </div>
      )}
    </Modal>,
    document.body
  );
}
