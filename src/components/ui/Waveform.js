'use client';
/**
 * The site's one decorative motif: amplitude traces across Wi-Fi subcarriers,
 * the kind of channel state information signal her research is built on.
 * Drawn once on load; static for visitors who prefer reduced motion.
 */
import { useMemo } from 'react';

function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export default function Waveform({ className = '', lines = 6, height = 120, subcarriers = 56, seed = 7 }) {
  const paths = useMemo(() => {
    const rand = rng(seed);
    const out = [];
    for (let l = 0; l < lines; l += 1) {
      const phase = rand() * Math.PI * 2;
      const freq = 1.2 + rand() * 2.2;
      const amp = 0.18 + rand() * 0.22;
      const base = 0.35 + l * (0.42 / lines);
      const pts = [];
      for (let i = 0; i <= subcarriers; i += 1) {
        const x = (i / subcarriers) * 1000;
        const fade = Math.sin((i / subcarriers) * Math.PI) ** 0.6;
        const y =
          base +
          amp * fade * Math.sin((i / subcarriers) * Math.PI * freq + phase) * 0.6 +
          (rand() - 0.5) * 0.06 * fade;
        pts.push(`${x.toFixed(1)},${(y * height).toFixed(1)}`);
      }
      out.push({ d: `M${pts.join(' L')}`, emphasis: l === Math.floor(lines / 2) });
    }
    return out;
  }, [lines, height, subcarriers, seed]);

  return (
    <svg className={className} viewBox={`0 0 1000 ${height}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
      {paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill="none"
          vectorEffect="non-scaling-stroke"
          className="wave-line"
          style={{
            stroke: p.emphasis ? 'var(--highlight)' : 'var(--accent)',
            strokeWidth: p.emphasis ? 1.6 : 1,
            opacity: p.emphasis ? 0.85 : 0.22 + i * 0.04,
            animationDelay: `${i * 90}ms`,
          }}
        />
      ))}
    </svg>
  );
}
