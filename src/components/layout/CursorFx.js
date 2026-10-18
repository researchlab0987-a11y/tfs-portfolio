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
 *   dot      dot + drifting follower      invert    colour-inverting circle
 *   crosshair precise crosshair           ripple    rings on click, pulse on links
 *   trail    arrow + dotted trail         rainbow   arrow + colour-shifting tail
 *   pixel    arrow + square pixel trail   bubbles   normal pointer + rising bubbles
 *   laser    glowing red laser dot
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
const MODES = ['comet', 'arrow', 'ring', 'sparkle', 'glow', 'dot', 'invert', 'crosshair', 'ripple', 'trail', 'rainbow', 'pixel', 'bubbles', 'laser', 'none'];
// Styles that draw their own pointer (the system one is hidden).
const HIDES_SYSTEM = ['comet', 'arrow', 'ring', 'sparkle', 'dot', 'invert', 'crosshair', 'trail', 'rainbow', 'pixel', 'laser'];
const ARROW_MODES = ['comet', 'arrow', 'sparkle', 'trail', 'rainbow', 'pixel'];

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
  const invertRef = useRef(null);

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
    const inv = invertRef.current;
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
    const bits = []; // pixel squares and bubbles
    const ripples = []; // click rings
    const invPos = { x: -200, y: -200, s: 28 };
    const lastDrop = { x: -999, y: -999 }; // dotted trail spacing
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
        bits.length = 0;
        ripples.length = 0;
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
      inv.classList.remove('is-hover');
    };

    const hover = (el) => {
      if (el === target) return;
      release();
      target = el;
      const r = el.getBoundingClientRect();
      big = r.width > BIG_W || r.height > BIG_H;
      if (!big) el.classList.add('fx-magnet');
      arrow.classList.add('is-hover');
      inv.classList.add('is-hover');
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
      const now = performance.now();
      if (mode === 'comet' || mode === 'rainbow' || mode === 'laser') points.push({ x: mouse.x, y: mouse.y, t: now });
      if (mode === 'trail' && Math.hypot(mouse.x - lastDrop.x, mouse.y - lastDrop.y) > 10) {
        points.push({ x: mouse.x, y: mouse.y, t: now });
        lastDrop.x = mouse.x;
        lastDrop.y = mouse.y;
      }
      if (mode === 'pixel' && bits.length < 140) {
        const g = 7;
        const gx = Math.round(mouse.x / g) * g;
        const gy = Math.round(mouse.y / g) * g;
        if (!bits.some((b) => b.x === gx && b.y === gy && b.life > 0.6)) bits.push({ x: gx, y: gy, life: 1, white: Math.random() < 0.2 });
      }
      if (mode === 'bubbles' && bits.length < 60 && Math.random() < Math.min(1, Math.hypot(dx, dy) / 14)) {
        bits.push({ x: mouse.x, y: mouse.y, r: 3 + Math.random() * 6, vx: (Math.random() - 0.5) * 0.6, vy: -(0.5 + Math.random() * 0.9), life: 1 });
      }
      if (mode === 'sparkle') {
        const dist = Math.hypot(dx, dy);
        if (dist > 2 && sparks.length < 160) burst(mouse.x, mouse.y, Math.min(3, Math.ceil(dist / 12)));
      }
    };

    const drawComet = (now, rainbow = false) => {
      while (points.length && now - points[0].t > TAIL_MS) points.shift();
      if (points.length < 2) return false;
      const [r, g, b] = rgb;
      const boost = target ? 1.35 : 1;
      const hueBase = (now / 6) % 360;
      ctx.lineCap = 'round';
      const pts = [...points, { x: mouse.x, y: mouse.y, t: now }];
      for (let i = 1; i < pts.length; i++) {
        const life = 1 - (now - pts[i].t) / TAIL_MS;
        if (life <= 0) continue;
        ctx.strokeStyle = rainbow
          ? `hsla(${(hueBase + i * 14) % 360}, 90%, 60%, ${Math.min(1, 0.75 * life * boost)})`
          : `rgba(${r}, ${g}, ${b}, ${Math.min(1, 0.55 * life * life * boost)})`;
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

    const drawDot = () => {
      glowPos.x += (mouse.x - glowPos.x) * 0.16;
      glowPos.y += (mouse.y - glowPos.y) * 0.16;
      const [r, g, b] = rgb;
      const fr = target ? 20 : 11;
      ctx.beginPath();
      ctx.arc(glowPos.x, glowPos.y, fr, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${target ? 0.18 : 0.12})`;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.55)`;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fill();
      return true;
    };

    const drawCrosshair = () => {
      const [r, g, b] = rgb;
      const { x, y } = mouse;
      const gap = target ? 9 : 5;
      const len = target ? 9 : 11;
      ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - gap - len, y); ctx.lineTo(x - gap, y);
      ctx.moveTo(x + gap, y); ctx.lineTo(x + gap + len, y);
      ctx.moveTo(x, y - gap - len); ctx.lineTo(x, y - gap);
      ctx.moveTo(x, y + gap); ctx.lineTo(x, y + gap + len);
      ctx.stroke();
      if (target) {
        ctx.beginPath();
        ctx.arc(x, y, gap + 3, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.5)`;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fill();
      return true;
    };

    const drawRipples = (now, dt) => {
      const [r, g, b] = rgb;
      let drew = false;
      if (target && active) {
        const pr = 16 + Math.sin(now / 180) * 4;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, pr, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.45)`;
        ctx.lineWidth = 2;
        ctx.stroke();
        drew = true;
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        const p = ripples[i];
        p.life -= dt / 650;
        if (p.life <= 0) {
          ripples.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6 + (1 - p.life) * 46, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${p.life * 0.7})`;
        ctx.lineWidth = 2.5 * p.life + 0.5;
        ctx.stroke();
        drew = true;
      }
      return drew;
    };

    const drawDots = (now) => {
      while (points.length && now - points[0].t > 420) points.shift();
      if (!points.length) return false;
      const [r, g, b] = rgb;
      points.forEach((p) => {
        const life = 1 - (now - p.t) / 420;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.2 + 3 * life, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.75 * life})`;
        ctx.fill();
      });
      return true;
    };

    const drawPixels = (dt) => {
      if (!bits.length) return false;
      const [r, g, b] = rgb;
      for (let i = bits.length - 1; i >= 0; i--) {
        const p = bits[i];
        p.life -= dt / 520;
        if (p.life <= 0) {
          bits.splice(i, 1);
          continue;
        }
        const sz = 6 * (0.5 + p.life * 0.5);
        ctx.fillStyle = p.white ? `rgba(255, 255, 255, ${p.life})` : `rgba(${r}, ${g}, ${b}, ${p.life * 0.85})`;
        ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
      }
      return true;
    };

    const drawBubbles = (dt) => {
      if (!bits.length) return false;
      const [r, g, b] = rgb;
      const step = dt / 16.7;
      for (let i = bits.length - 1; i >= 0; i--) {
        const p = bits[i];
        p.x += p.vx * step + Math.sin((p.y + i) / 14) * 0.25;
        p.y += p.vy * step;
        p.life -= dt / 1300;
        if (p.life <= 0) {
          bits.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.08 * p.life})`;
        ctx.fill();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.55 * p.life})`;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(p.x - p.r * 0.35, p.y - p.r * 0.35, p.r * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.7 * p.life})`;
        ctx.fill();
      }
      return true;
    };

    const drawLaser = (now) => {
      while (points.length && now - points[0].t > 110) points.shift();
      const red = target ? [255, 70, 90] : [255, 45, 60];
      if (points.length > 1) {
        ctx.lineCap = 'round';
        for (let i = 1; i < points.length; i++) {
          const life = 1 - (now - points[i].t) / 110;
          ctx.strokeStyle = `rgba(${red[0]}, ${red[1]}, ${red[2]}, ${0.5 * life})`;
          ctx.lineWidth = 3 * life + 0.5;
          ctx.beginPath();
          ctx.moveTo(points[i - 1].x, points[i - 1].y);
          ctx.lineTo(points[i].x, points[i].y);
          ctx.stroke();
        }
      }
      const rad = target ? 22 : 16;
      const glow = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, rad);
      glow.addColorStop(0, `rgba(${red[0]}, ${red[1]}, ${red[2]}, 0.55)`);
      glow.addColorStop(1, `rgba(${red[0]}, ${red[1]}, ${red[2]}, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, target ? 4.5 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fff5f6';
      ctx.fill();
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
      if (mode === 'invert') {
        invPos.x += (mouse.x - invPos.x) * 0.3;
        invPos.y += (mouse.y - invPos.y) * 0.3;
        inv.style.transform = `translate3d(${invPos.x}px, ${invPos.y}px, 0)`;
      }
      if (!active && !sparks.length && !bits.length && !ripples.length) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (mode === 'comet' && active) painted = drawComet(now);
      else if (mode === 'rainbow' && active) painted = drawComet(now, true);
      else if (mode === 'sparkle') painted = drawSparks(dt);
      else if (mode === 'glow' && active) painted = drawGlow();
      else if (mode === 'dot' && active) painted = drawDot();
      else if (mode === 'crosshair' && active) painted = drawCrosshair();
      else if (mode === 'ripple') painted = drawRipples(now, dt);
      else if (mode === 'trail' && active) painted = drawDots(now);
      else if (mode === 'pixel') painted = drawPixels(dt);
      else if (mode === 'bubbles') painted = drawBubbles(dt);
      else if (mode === 'laser' && active) painted = drawLaser(now);
    };

    const onDown = (e) => {
      arrow.classList.add('is-down');
      ring.classList.add('is-down');
      if (active && mode === 'sparkle') burst(e.clientX, e.clientY, 14);
      if (active && mode === 'ripple') ripples.push({ x: e.clientX, y: e.clientY, life: 1 });
      inv.classList.add('is-down');
    };
    const onUp = () => {
      arrow.classList.remove('is-down');
      ring.classList.remove('is-down');
      inv.classList.remove('is-down');
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
      <div ref={invertRef} className="fx-invert" aria-hidden="true" />
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
