'use client';
/**
 * Pointer style picker for Design: one illustrated tile per style, and a
 * "Try it here" box where the selected style runs live before saving
 * (CursorFx honours [data-cursor-preview] even on the dashboard).
 */
import { CURSOR_STYLES } from '@/lib/cursorStyles';
import { cx } from '@/lib/utils';
import { Check } from 'lucide-react';

const ARROW = 'M2 2 L22.5 10.2 L13.6 12.4 L11 21.8 Z';

function Arrow({ x, y, s = 1, system = false, glow = false }) {
  return (
    <path
      d={ARROW}
      transform={`translate(${x} ${y}) scale(${s})`}
      fill={system ? '#111' : 'var(--accent)'}
      stroke="#fff"
      strokeWidth={1.6}
      strokeLinejoin="round"
      style={glow ? { filter: 'drop-shadow(0 0 4px var(--accent))' } : undefined}
    />
  );
}

function Star({ x, y, r, white }) {
  const d = `M${x} ${y - r * 1.6} L${x + r * 0.4} ${y - r * 0.4} L${x + r * 1.6} ${y} L${x + r * 0.4} ${y + r * 0.4} L${x} ${y + r * 1.6} L${x - r * 0.4} ${y + r * 0.4} L${x - r * 1.6} ${y} L${x - r * 0.4} ${y - r * 0.4} Z`;
  return <path d={d} fill={white ? '#cbd5e1' : 'var(--accent)'} />;
}

function Illustration({ style }) {
  return (
    <svg viewBox="0 0 96 56" className="h-14 w-full" aria-hidden="true">
      <defs>
        <linearGradient id="cp-tail" x1="0" x2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity=".75" />
        </linearGradient>
        <radialGradient id="cp-glow">
          <stop offset="0" stopColor="var(--accent)" stopOpacity=".45" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
      </defs>
      {style === 'comet' && (
        <>
          <path d="M8 44 Q 30 40 52 22" stroke="url(#cp-tail)" strokeWidth="7" strokeLinecap="round" fill="none" />
          <Arrow x={50} y={18} />
        </>
      )}
      {style === 'arrow' && <Arrow x={36} y={14} s={1.1} glow />}
      {style === 'ring' && (
        <>
          <rect x="18" y="16" width="52" height="22" rx="11" fill="#e2e8f0" />
          <rect x="13" y="11" width="62" height="32" rx="16" fill="color-mix(in srgb, var(--accent) 12%, transparent)" stroke="var(--accent)" strokeOpacity=".6" strokeWidth="1.5" />
          <circle cx="58" cy="28" r="2.6" fill="var(--accent)" />
        </>
      )}
      {style === 'sparkle' && (
        <>
          <Star x={20} y={38} r={2.2} />
          <Star x={30} y={28} r={1.6} white />
          <Star x={14} y={24} r={1.4} />
          <Star x={38} y={40} r={1.8} white />
          <Star x={44} y={30} r={2.4} />
          <Arrow x={50} y={14} />
        </>
      )}
      {style === 'glow' && (
        <>
          <circle cx="48" cy="28" r="26" fill="url(#cp-glow)" />
          <Arrow x={46} y={20} s={0.85} system />
        </>
      )}
      {style === 'none' && <Arrow x={40} y={14} s={1.05} system />}
      {style === 'dot' && (
        <>
          <circle cx="40" cy="30" r="11" fill="color-mix(in srgb, var(--accent) 14%, transparent)" stroke="var(--accent)" strokeOpacity=".55" strokeWidth="1.5" />
          <circle cx="54" cy="24" r="4" fill="var(--accent)" />
        </>
      )}
      {style === 'invert' && (
        <>
          <rect x="16" y="14" width="64" height="12" rx="3" fill="#0f172a" />
          <rect x="16" y="30" width="44" height="8" rx="3" fill="#94a3b8" />
          <circle cx="44" cy="26" r="14" fill="#fff" style={{ mixBlendMode: 'difference' }} />
        </>
      )}
      {style === 'crosshair' && (
        <g stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
          <path d="M30 28h10M56 28h10M48 10v10M48 36v10" />
          <circle cx="48" cy="28" r="2" fill="var(--accent)" stroke="none" />
        </g>
      )}
      {style === 'ripple' && (
        <>
          <circle cx="48" cy="28" r="20" fill="none" stroke="var(--accent)" strokeOpacity=".25" strokeWidth="1.5" />
          <circle cx="48" cy="28" r="12" fill="none" stroke="var(--accent)" strokeOpacity=".6" strokeWidth="2" />
          <Arrow x={46} y={24} s={0.75} system />
        </>
      )}
      {style === 'trail' && (
        <>
          {[[14, 44, 1.5], [24, 40, 2], [33, 35, 2.6], [42, 29, 3.2]].map(([cx, cy, r]) => (
            <circle key={cx} cx={cx} cy={cy} r={r} fill="var(--accent)" opacity={r / 3.6} />
          ))}
          <Arrow x={48} y={16} />
        </>
      )}
      {style === 'rainbow' && (
        <>
          <defs>
            <linearGradient id="cp-rainbow" x1="0" x2="1">
              <stop offset="0" stopColor="#ef4444" stopOpacity=".2" />
              <stop offset=".33" stopColor="#f59e0b" />
              <stop offset=".66" stopColor="#22c55e" />
              <stop offset="1" stopColor="#6366f1" />
            </linearGradient>
          </defs>
          <path d="M8 44 Q 30 40 52 22" stroke="url(#cp-rainbow)" strokeWidth="7" strokeLinecap="round" fill="none" />
          <Arrow x={50} y={18} />
        </>
      )}
      {style === 'pixel' && (
        <>
          {[[14, 40, 0.3], [21, 36, 0.45], [28, 33, 0.6], [35, 29, 0.75], [42, 26, 0.9]].map(([x, y, o]) => (
            <rect key={x} x={x} y={y} width="6" height="6" fill="var(--accent)" opacity={o} />
          ))}
          <Arrow x={48} y={14} />
        </>
      )}
      {style === 'bubbles' && (
        <>
          {[[30, 20, 6], [42, 12, 4], [24, 34, 4.5], [52, 22, 3]].map(([cx, cy, r]) => (
            <circle key={cx} cx={cx} cy={cy} r={r} fill="color-mix(in srgb, var(--accent) 10%, transparent)" stroke="var(--accent)" strokeOpacity=".6" />
          ))}
          <Arrow x={46} y={30} s={0.8} system />
        </>
      )}
      {style === 'laser' && (
        <>
          <path d="M16 40 L46 26" stroke="#ff2d3c" strokeOpacity=".45" strokeWidth="3" strokeLinecap="round" />
          <circle cx="48" cy="25" r="12" fill="url(#cp-laser)" />
          <defs>
            <radialGradient id="cp-laser">
              <stop offset="0" stopColor="#ff2d3c" stopOpacity=".7" />
              <stop offset="1" stopColor="#ff2d3c" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="48" cy="25" r="3.5" fill="#fff5f6" />
        </>
      )}
    </svg>
  );
}

export default function CursorPicker({ value, onChange }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {CURSOR_STYLES.map((s) => {
          const on = s.value === value;
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => onChange(s.value)}
              aria-pressed={on}
              data-tip={`${s.label}|${s.text}`}
              className={cx(
                'relative rounded-xl border p-2.5 text-left transition',
                on ? 'border-[#0d7a6f] bg-[#0d7a6f]/5 ring-2 ring-[#0d7a6f]/25' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              )}
            >
              {on && (
                <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-[#0d7a6f] text-white">
                  <Check size={12} />
                </span>
              )}
              <span className="block rounded-lg bg-slate-50">
                <Illustration style={s.value} />
              </span>
              <span className="mt-2 block text-[13px] font-semibold text-slate-900">{s.label}</span>
              <span className="block text-[11.5px] leading-snug text-slate-500">{s.text}</span>
            </button>
          );
        })}
      </div>

      <div
        data-cursor-preview
        data-cursor-style={value}
        className="rounded-xl border-2 border-dashed border-slate-300 bg-[repeating-linear-gradient(45deg,#f8fafc_0_10px,#fff_10px_20px)] p-5"
      >
        <p className="mb-3 text-[12.5px] font-semibold text-slate-600">
          Try it here: move the mouse around this box. {value === 'none' ? 'This style uses the normal pointer.' : ''}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" className="ui-btn ui-btn-accent">
            A button
          </button>
          <a href="#try" onClick={(e) => e.preventDefault()} className="text-[13.5px] font-medium text-[#0d7a6f] underline underline-offset-4">
            A text link
          </a>
          <a
            href="https://example.org"
            onClick={(e) => e.preventDefault()}
            className="block w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:w-[360px]"
          >
            <span className="block text-[13px] font-semibold text-slate-900">A card that opens something</span>
            <span className="block text-[12px] text-slate-500">Large clickable areas get a softer effect.</span>
          </a>
        </div>
        <p className="mt-3 text-[11.5px] text-slate-500">Only mouse and trackpad users see pointer styles. Phones and people who prefer reduced motion get the normal pointer.</p>
      </div>
    </div>
  );
}
