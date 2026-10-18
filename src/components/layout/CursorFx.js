'use client';
/**
 * Interactive pointer for mouse users, in the style chosen in
 * Design > Pointer (lib/cursorStyles.js):
 *
 *   comet    accent arrow + glowing tapered tail
 *   arrow    accent arrow only
 *   ring     dot + ring that wraps around buttons and links
 *   sparkle  accent arrow that scatters sparks while moving and on click
 *   glow     normal pointer with a soft spotlight following it
 *   none     system pointer
 *
 * In every style, small clickables lean a little toward the pointer and
 * clickable text gets a label ("Open", "Visit ↗"…) saying what a click does.
 *
 * Off on touch screens, for reduced motion, inside admin tools (.ui) and
 * over text fields. On the dashboard and sign-in page it only runs inside a
 * "Try it here" box ([data-cursor-preview] with data-cursor-style), so the
 * chosen style can be tested before saving.
 */
import { cursorStyleOf } from '@/lib/cursorStyles';
import { useConfig } from '@/lib/store';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const CLICKABLE = [
  'a[href]',
  'button:not(:disabled)',
  '[role="button"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="link"]',
  'summary',
  'label[for]',
  'select',
  'input[type="checkbox"]',
  'input[type="radio"]',
  'input[type="submit"]',
  'input[type="button"]',
  '[data-cursor="grab"]',
  '.cursor-pointer',
].join(',');
const PLAIN = 'input, textarea, [contenteditable], [role="separator"], .ui';
const PREVIEW = '[data-cursor-preview]';
const MODES = ['comet', 'arrow', 'ring', 'sparkle', 'glow', 'none'];
const HIDES_SYSTEM = ['comet', 'arrow', 'ring', 'sparkle'];
const ARROW_MODES = ['comet', 'arrow', 'sparkle'];

const MAGNET = 0.18; // how far a small clickable leans toward the pointer
const MAX_LEAN = 7;
const BIG_W = 340; // cards and other large blocks do not lean
const BIG_H = 140;
const TAIL_MS = 260; // comet: how long a point stays in the tail
const TAIL_W = 7; // comet: tail width at the head, px
const RING_PAD = 6; // ring: gap around a hugged element

const transparent = (c) => !c || c === 'transparent' || /rgba?\([^)]*,\s*0\)$/.test(c);

/**
 * Words shown beside the pointer, so clickable text is obvious. Buttons and
 * the menu already look clickable and get none; data-cursor-label overrides.
 */
function labelFor(el, big) {
  if (el.dataset.cursorLabel) return el.dataset.cursorLabel;
  if (el.closest('header, nav')) return '';
  if (/^(BUTTON|SELECT|INPUT|LABEL|SUMMARY)$/.test(el.tagName)) return '';
  if (!big) {
    const cs = getComputedStyle(el);
    const boxed = !transparent(cs.backgroundColor) || parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderBottomWidth) > 0;
    if (boxed) return ''; // styled like a button or chip already
  }
  if (el.tagName !== 'A') return 'Open';
  const href = el.getAttribute('href') || '';
  if (href.startsWith('mailto:')) return 'Email';
  if (href.startsWith('tel:')) return 'Call';
  if (el.hasAttribute('download') || /\.(pdf|docx?|pptx?|xlsx?|zip)(\?|#|$)/i.test(href)) return 'Download';
  if (href.startsWith('#')) return 'Jump';
  if (el.target === '_blank' || (/^https?:/i.test(href) && !href.startsWith(window.location.origin))) return 'Visit ↗';
  return 'Open';
}

function parseColor(str) {
  // Resolve any CSS colour (hex, rgb, color-mix…) to [r, g, b].
  const c = document.createElement('canvas').getContext('2d');
  c.fillStyle = '#000';
  c.fillStyle = str || '#000';
  const v = c.fillStyle;
  if (v.startsWith('#')) return [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16));
  const m = v.match(/[\d.]+/g);
  return m ? m.slice(0, 3).map(Number) : [0, 0, 0];
}

export default function CursorFx() {
  const config = useConfig();
  const pathname = usePathname() || '';
  // The dashboard and sign-in page keep the normal pointer (except previews).
  const toolPage = pathname.startsWith('/admin') || pathname.startsWith('/login');
  const siteMode = cursorStyleOf(config.effects);
  const settings = useRef({ siteMode, toolPage });
  settings.current = { siteMode, toolPage };

  const [capable, setCapable] = useState(false);
  const arrowRef = useRef(null);
  const trailRef = useRef(null);
  const labelRef = useRef(null);
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const still = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setCapable(fine.matches && !still.matches);
    update();
    fine.addEventListener?.('change', update);
    still.addEventListener?.('change', update);
    return () => {
      fine.removeEventListener?.('change', update);
      still.removeEventListener?.('change', update);
    };
  }, []);

  useEffect(() => {
    if (!capable) return undefined;
    const root = document.documentElement;
    const arrow = arrowRef.current;
    const canvas = trailRef.current;
    const label = labelRef.current;
    const dot = dotRef.current;
    const ring = ringRef.current;
    const ctx = canvas.getContext('2d');

    let dpr = 1;
    const fit = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
    };
    fit();

    let rgb = parseColor(getComputedStyle(root).getPropertyValue('--accent'));
    const colorTimer = setInterval(() => {
      rgb = parseColor(getComputedStyle(root).getPropertyValue('--accent'));
    }, 1500);

    const mouse = { x: -200, y: -200 };
    const ringPos = { x: -200, y: -200, w: 34, h: 34 };
    const glowPos = { x: -200, y: -200 };
    const points = []; // comet tail
    const sparks = []; // sparkle particles
    const lean = { x: 0, y: 0 };
    let mode = 'none';
    let active = false; // drawing anything right now
    let target = null; // clickable under the pointer
    let big = false;
    let frame = 0;
    let painted = false;
    let lastT = performance.now();

    const setMode = (next, on) => {
      if (next !== mode) {
        MODES.forEach((m) => root.classList.remove(`fx-mode-${m}`));
        root.classList.add(`fx-mode-${next}`);
        mode = next;
        points.length = 0;
        sparks.length = 0;
      }
      active = on && mode !== 'none';
      root.classList.toggle('fx-on', active);
      root.classList.toggle('fx-hide', active && HIDES_SYSTEM.includes(mode));
    };

    const setLean = (x, y) => {
      lean.x = x;
      lean.y = y;
      if (target) target.style.translate = x || y ? `${x}px ${y}px` : '';
    };

    const release = () => {
      if (!target) return;
      setLean(0, 0);
      const el = target;
      setTimeout(() => el.classList.remove('fx-magnet'), 400);
      target = null;
      big = false;
      arrow.classList.remove('is-hover');
      label.classList.remove('is-on');
      ring.classList.remove('is-hug', 'is-big');
      ring.style.borderRadius = '';
      dot.classList.remove('is-hidden');
    };

    const hover = (el) => {
      if (el === target) return;
      release();
      target = el;
      const r = el.getBoundingClientRect();
      big = r.width > BIG_W || r.height > BIG_H;
      if (!big) el.classList.add('fx-magnet');
      arrow.classList.add('is-hover');
      if (big) ring.classList.add('is-big');
      else {
        ring.classList.add('is-hug');
        dot.classList.add('is-hidden');
        const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 6;
        ring.style.borderRadius = `${Math.min(radius + RING_PAD, (r.height + RING_PAD * 2) / 2)}px`;
      }
      const text = labelFor(el, big);
      if (text) {
        label.textContent = text;
        label.classList.add('is-on');
      }
    };

    /** Decide the style and the hovered element for whatever is under (x, y). */
    const inspect = (el) => {
      const zone = el?.closest(PREVIEW);
      const { siteMode: sm, toolPage: tp } = settings.current;
      const want = zone ? zone.dataset.cursorStyle || sm : tp ? 'none' : sm;
      const plain = !zone && el?.closest(PLAIN);
      setMode(MODES.includes(want) ? want : 'comet', Boolean(el) && !plain);
      if (!active) return release();
      const hit = el.closest(CLICKABLE);
      // Inside a preview box only its own contents count.
      if (hit && (!zone || zone.contains(hit))) hover(hit);
      else release();
    };

    const burst = (x, y, n) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const v = 0.6 + Math.random() * 2.2;
        sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.6, life: 1, size: 1.5 + Math.random() * 2.5, white: Math.random() < 0.3 });
      }
    };

    const onMove = (e) => {
      const dx = e.clientX - mouse.x;
      const dy = e.clientY - mouse.y;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      inspect(e.target instanceof Element ? e.target : null);
      if (!active) return;
      if (mode === 'comet') points.push({ x: mouse.x, y: mouse.y, t: performance.now() });
      if (mode === 'sparkle') {
        const dist = Math.hypot(dx, dy);
        if (dist > 2 && sparks.length < 160) burst(mouse.x, mouse.y, Math.min(3, Math.ceil(dist / 12)));
      }
    };

    const drawComet = (now) => {
      while (points.length && now - points[0].t > TAIL_MS) points.shift();
      if (points.length < 2) return false;
      const [r, g, b] = rgb;
      const boost = target ? 1.35 : 1;
      ctx.lineCap = 'round';
      const pts = [...points, { x: mouse.x, y: mouse.y, t: now }];
      for (let i = 1; i < pts.length; i++) {
        const life = 1 - (now - pts[i].t) / TAIL_MS;
        if (life <= 0) continue;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${Math.min(1, 0.55 * life * life * boost)})`;
        ctx.lineWidth = Math.max(0.5, TAIL_W * life * boost);
        ctx.beginPath();
        ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
        ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
      }
      const glow = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 14 * boost);
      glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.35 * boost})`);
      glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 14 * boost, 0, Math.PI * 2);
      ctx.fill();
      return true;
    };

    const drawSparks = (dt) => {
      if (!sparks.length) return false;
      const [r, g, b] = rgb;
      const step = dt / 16.7;
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.x += p.vx * step;
        p.y += p.vy * step;
        p.vy += 0.07 * step; // gravity
        p.vx *= 0.98;
        p.life -= dt / 650;
        if (p.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        const s = p.size * (0.4 + p.life * 0.6);
        ctx.fillStyle = p.white ? `rgba(255, 255, 255, ${p.life})` : `rgba(${r}, ${g}, ${b}, ${p.life})`;
        // Four-point star.
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - s * 1.6);
        ctx.lineTo(p.x + s * 0.4, p.y - s * 0.4);
        ctx.lineTo(p.x + s * 1.6, p.y);
        ctx.lineTo(p.x + s * 0.4, p.y + s * 0.4);
        ctx.lineTo(p.x, p.y + s * 1.6);
        ctx.lineTo(p.x - s * 0.4, p.y + s * 0.4);
        ctx.lineTo(p.x - s * 1.6, p.y);
        ctx.lineTo(p.x - s * 0.4, p.y - s * 0.4);
        ctx.closePath();
        ctx.fill();
      }
      return true;
    };

    const drawGlow = () => {
      glowPos.x += (mouse.x - glowPos.x) * 0.18;
      glowPos.y += (mouse.y - glowPos.y) * 0.18;
      const [r, g, b] = rgb;
      const radius = target ? 70 : 130;
      const alpha = target ? 0.3 : 0.16;
      const grad = ctx.createRadialGradient(glowPos.x, glowPos.y, 0, glowPos.x, glowPos.y, radius);
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha})`);
      grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(glowPos.x, glowPos.y, radius, 0, Math.PI * 2);
      ctx.fill();
      return true;
    };

    const updateRing = () => {
      let cx = mouse.x;
      let cy = mouse.y;
      let w = 34;
      let h = 34;
      if (target && !big) {
        const r = target.getBoundingClientRect();
        cx = r.left + r.width / 2;
        cy = r.top + r.height / 2;
        w = r.width + RING_PAD * 2;
        h = r.height + RING_PAD * 2;
      } else if (big) {
        w = h = 64;
      }
      const ease = target && !big ? 0.3 : 0.22;
      ringPos.x += (cx - ringPos.x) * ease;
      ringPos.y += (cy - ringPos.y) * ease;
      ringPos.w += (w - ringPos.w) * 0.25;
      ringPos.h += (h - ringPos.h) * 0.25;
      ring.style.width = `${ringPos.w}px`;
      ring.style.height = `${ringPos.h}px`;
      ring.style.transform = `translate3d(${ringPos.x - ringPos.w / 2}px, ${ringPos.y - ringPos.h / 2}px, 0)`;
      dot.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0)`;
    };

    const tick = (now) => {
      frame = requestAnimationFrame(tick);
      const dt = Math.min(50, now - lastT);
      lastT = now;
      if (target && !target.isConnected) release();

      if (active && target && !big) {
        const rect = target.getBoundingClientRect();
        // The rect already includes the lean; measure from the resting spot.
        const ex = rect.left + rect.width / 2 - lean.x;
        const ey = rect.top + rect.height / 2 - lean.y;
        setLean(
          Math.max(-MAX_LEAN, Math.min(MAX_LEAN, (mouse.x - ex) * MAGNET)),
          Math.max(-MAX_LEAN, Math.min(MAX_LEAN, (mouse.y - ey) * MAGNET))
        );
      }

      if (ARROW_MODES.includes(mode)) arrow.style.transform = `translate3d(${mouse.x - 2}px, ${mouse.y - 2}px, 0)`;
      if (mode === 'ring') updateRing();
      label.style.transform = `translate3d(${mouse.x + 20}px, ${mouse.y + 18}px, 0)`;

      if (painted) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        painted = false;
      }
      if (!active && !sparks.length) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (mode === 'comet' && active) painted = drawComet(now);
      else if (mode === 'sparkle') painted = drawSparks(dt);
      else if (mode === 'glow' && active) painted = drawGlow();
    };

    const onDown = (e) => {
      arrow.classList.add('is-down');
      ring.classList.add('is-down');
      if (active && mode === 'sparkle') burst(e.clientX, e.clientY, 14);
    };
    const onUp = () => {
      arrow.classList.remove('is-down');
      ring.classList.remove('is-down');
    };
    const onLeave = () => {
      points.length = 0;
      setMode(mode, false);
      release();
    };
    const onScroll = () => {
      // Content moved under a still mouse: re-check what is beneath it.
      inspect(document.elementFromPoint(mouse.x, mouse.y));
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('resize', fit);
    document.addEventListener('mouseleave', onLeave);
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      clearInterval(colorTimer);
      release();
      root.classList.remove('fx-on', 'fx-hide', ...MODES.map((m) => `fx-mode-${m}`));
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('resize', fit);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, [capable]);

  if (!capable) return null;
  return (
    <>
      <canvas ref={trailRef} className="fx-trail" aria-hidden="true" />
      <div ref={ringRef} className="fx-ring" aria-hidden="true" />
      <div ref={dotRef} className="fx-dot" aria-hidden="true" />
      <div ref={labelRef} className="fx-label" aria-hidden="true" />
      <div ref={arrowRef} className="fx-arrow" aria-hidden="true">
        <svg viewBox="0 0 26 26">
          {/* Swept arrowhead with a notched tail, tip at (2, 2). */}
          <path className="fx-body" d="M2 2 L22.5 10.2 L13.6 12.4 L11 21.8 Z" />
          <path className="fx-shine" d="M4.6 4.6 L17 9.6 L11.6 10.9 Z" />
        </svg>
      </div>
    </>
  );
}
