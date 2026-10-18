'use client';
/**
 * Bottom sheet for phones: slides up from the bottom, starts at half the
 * screen, and can be resized by dragging its handle (or with the arrow keys
 * on the focused handle). Dragging it low enough closes it. The height a
 * visitor leaves it at is remembered per sheet.
 *
 * useSheetHeight is exported for panels that draw their own sheet (Drawer).
 */
import { cx, safeLocalStorage } from '@/lib/utils';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const MAX = 94; // % of the screen
const MIN_KEEP = 22; // dragged below this: close

export function useSheetHeight(storageKey, fallback = 50, onClose) {
  const [height, setHeight] = useState(fallback);
  const [dragging, setDragging] = useState(false);
  const start = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    try {
      const v = Number(safeLocalStorage()?.getItem(`tfs:sheet:${storageKey}`));
      if (v >= MIN_KEEP && v <= MAX) setHeight(v);
    } catch {
      // Storage blocked: use the default height.
    }
  }, [storageKey]);

  const remember = (v) => {
    try {
      safeLocalStorage()?.setItem(`tfs:sheet:${storageKey}`, String(Math.round(v)));
    } catch {
      // Not remembered.
    }
  };

  const onPointerDown = useCallback(
    (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      if (e.target.closest('button, a, input, select, textarea')) return; // let controls in the header work
      e.currentTarget.setPointerCapture?.(e.pointerId);
      start.current = { y: e.clientY, h: height };
      setDragging(true);
    },
    [height]
  );
  const onPointerMove = useCallback((e) => {
    if (!start.current) return;
    const dy = e.clientY - start.current.y;
    const h = start.current.h - (dy / window.innerHeight) * 100;
    setHeight(Math.max(8, Math.min(MAX, h)));
  }, []);
  const onPointerUp = useCallback(() => {
    const s = start.current;
    if (!s) return;
    start.current = null;
    setDragging(false);
    setHeight((h) => {
      if (h < MIN_KEEP) {
        setTimeout(() => closeRef.current?.(), 0);
        return s.h; // reopen at the height it had before this drag
      }
      remember(h);
      return h;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const onKeyDown = (e) => {
    const step = e.shiftKey ? 15 : 6;
    if (e.key === 'ArrowUp') setHeight((h) => (remember(Math.min(MAX, h + step)), Math.min(MAX, h + step)));
    else if (e.key === 'ArrowDown') setHeight((h) => (remember(Math.max(MIN_KEEP, h - step)), Math.max(MIN_KEEP, h - step)));
    else return;
    e.preventDefault();
  };

  // A height that closed the sheet should not be the next opening height.
  const reset = useCallback(() => setHeight((h) => (h < MIN_KEEP ? fallback : h)), [fallback]);

  return {
    height,
    dragging,
    reset,
    dragProps: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, style: { touchAction: 'none' } },
    handleProps: {
      role: 'slider',
      tabIndex: 0,
      'aria-label': 'Resize panel. Drag, or use the up and down arrow keys.',
      'aria-valuemin': MIN_KEEP,
      'aria-valuemax': MAX,
      'aria-valuenow': Math.round(height),
      onKeyDown,
    },
  };
}

export function SheetHandle({ handleProps, className = '' }) {
  return (
    <div className={cx('flex justify-center pb-1 pt-2.5', className)}>
      <span {...handleProps} className="block h-1.5 w-11 cursor-grab rounded-full bg-line outline-none focus-visible:ring-2 focus-visible:ring-accent active:cursor-grabbing" />
    </div>
  );
}

export default function BottomSheet({ open, onClose, label, storageKey, defaultHeight = 50, header = null, children }) {
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  const panelRef = useRef(null);
  const sheet = useSheetHeight(storageKey, defaultHeight, onClose);
  const { reset } = sheet;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return setEntered(false);
    reset();
    const t = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)));
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => {
      cancelAnimationFrame(t);
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, reset]);

  if (!mounted || !open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={label}>
      <div className={cx('absolute inset-0 bg-[#0b1220]/40 transition-opacity duration-300', entered ? 'opacity-100' : 'opacity-0')} onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cx(
          'absolute inset-x-0 bottom-0 flex flex-col rounded-t-[22px] border-t border-line bg-bg shadow-[0_-12px_40px_-12px_rgba(0,0,0,.35)] outline-none',
          !sheet.dragging && 'transition-[transform,height] duration-300 ease-[cubic-bezier(.22,1,.36,1)]',
          entered ? 'translate-y-0' : 'translate-y-full'
        )}
        style={{ height: `${sheet.height}dvh`, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div {...sheet.dragProps} className="shrink-0 cursor-grab select-none active:cursor-grabbing">
          <SheetHandle handleProps={sheet.handleProps} />
          {header}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>,
    document.body
  );
}
