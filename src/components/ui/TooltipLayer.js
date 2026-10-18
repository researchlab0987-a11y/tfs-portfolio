'use client';
/**
 * Hover help for the editing tools.
 *
 * One delegated listener shows a clear tooltip for:
 *   - anything with data-tip="Title" or data-tip="Title|Longer explanation"
 *     (anywhere on the site);
 *   - inside the admin tools (.ui): any element with a title, and icon-only
 *     buttons that only have an aria-label.
 * Native title tooltips are suppressed while ours is shown (the text is kept
 * for screen readers as aria-description). Works with the keyboard too:
 * tabbing onto a control shows its tip.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const SELECTOR = '[data-tip], .ui [title], .ui button[aria-label], .ui a[aria-label], .ui [role="button"][aria-label]';
const DELAY = 380;
const GAP = 8;

function tipText(el) {
  if (el.dataset.tip) return el.dataset.tip;
  if (el.dataset.tipTitle) return el.dataset.tipTitle;
  const title = el.getAttribute('title');
  if (title) {
    // Take over the native tooltip so two never show at once.
    el.dataset.tipTitle = title;
    el.removeAttribute('title');
    if (!el.getAttribute('aria-label') && !el.getAttribute('aria-description')) el.setAttribute('aria-description', title);
    return title;
  }
  const label = el.getAttribute('aria-label');
  // Only icon-only controls need their label repeated.
  if (label && !el.textContent.trim()) return label;
  return '';
}

export default function TooltipLayer() {
  const [tip, setTip] = useState(null); // { title, body, x, y, place }
  const [mounted, setMounted] = useState(false);
  const boxRef = useRef(null);
  const state = useRef({ el: null, timer: 0, lastHide: 0 });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const s = state.current;

    const hide = () => {
      clearTimeout(s.timer);
      if (s.el) s.lastHide = Date.now();
      s.el = null;
      setTip(null);
    };

    const show = (el) => {
      const text = tipText(el);
      if (!text) return;
      clearTimeout(s.timer);
      s.el = el;
      // Moving straight from one tip to the next feels instant.
      const wait = Date.now() - s.lastHide < 500 ? 0 : DELAY;
      s.timer = setTimeout(() => {
        if (s.el !== el || !el.isConnected) return;
        const [title, ...rest] = text.split('|');
        const r = el.getBoundingClientRect();
        const place = r.top > 90 ? 'top' : 'bottom';
        setTip({ title: title.trim(), body: rest.join('|').trim(), x: r.left + r.width / 2, y: place === 'top' ? r.top - GAP : r.bottom + GAP, place });
      }, wait);
    };

    const onOver = (e) => {
      const el = e.target instanceof Element ? e.target.closest(SELECTOR) : null;
      if (el === s.el) return;
      if (!el) return hide();
      hide();
      show(el);
    };
    const onFocus = (e) => {
      const el = e.target instanceof Element ? e.target.closest(SELECTOR) : null;
      if (el && el.matches(':focus-visible')) show(el);
    };

    document.addEventListener('pointerover', onOver);
    document.addEventListener('focusin', onFocus);
    document.addEventListener('focusout', hide);
    document.addEventListener('pointerdown', hide, true);
    window.addEventListener('scroll', hide, true);
    const onKey = (e) => e.key === 'Escape' && hide();
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(s.timer);
      document.removeEventListener('pointerover', onOver);
      document.removeEventListener('focusin', onFocus);
      document.removeEventListener('focusout', hide);
      document.removeEventListener('pointerdown', hide, true);
      window.removeEventListener('scroll', hide, true);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // Keep the bubble on screen horizontally.
  const [shift, setShift] = useState(0);
  useEffect(() => {
    const box = boxRef.current;
    if (!tip || !box) return setShift(0);
    const w = box.offsetWidth;
    const left = tip.x - w / 2;
    const min = 8;
    const max = window.innerWidth - w - 8;
    setShift(left < min ? min - left : left > max ? max - left : 0);
  }, [tip]);

  if (!mounted || !tip) return null;
  return createPortal(
    <div
      role="tooltip"
      className="ui pointer-events-none fixed z-[120] max-w-[260px] rounded-lg bg-slate-900 px-2.5 py-1.5 text-[12px] leading-snug text-white shadow-xl"
      style={{
        left: tip.x,
        top: tip.y,
        transform: `translate(calc(-50% + ${shift}px), ${tip.place === 'top' ? '-100%' : '0'})`,
        animation: 'tip-in .14s ease-out',
      }}
      ref={boxRef}
    >
      <span className="block font-semibold">{tip.title}</span>
      {tip.body && <span className="mt-0.5 block text-slate-300">{tip.body}</span>}
      <span
        className="absolute left-1/2 h-2 w-2 rotate-45 bg-slate-900"
        style={{ [tip.place === 'top' ? 'bottom' : 'top']: -4, marginLeft: -4 - shift }}
        aria-hidden="true"
      />
    </div>,
    document.body
  );
}
