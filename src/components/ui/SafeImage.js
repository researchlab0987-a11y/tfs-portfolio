'use client';
/**
 * <img> that never shows a broken-image icon. If the URL fails (expired link,
 * blocked host, offline) it swaps to a quiet placeholder with initials.
 */
import { optimized } from '@/lib/cloudinary';
import { cx } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';

function initials(text) {
  return String(text || '')
    .replace(/^(dr\.?|prof\.?)\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export default function SafeImage({ src, alt = '', className = '', width = 1200, fallbackText, style, ...rest }) {
  const [failed, setFailed] = useState(!src);
  const ref = useRef(null);
  useEffect(() => setFailed(!src), [src]);

  // An image in the server HTML can fail before React attaches onError;
  // catch that case once mounted.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, [src]);

  if (failed) {
    const label = initials(fallbackText || alt);
    return (
      <div
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        className={cx('flex items-center justify-center bg-bg3 text-muted select-none', className)}
        style={style}
      >
        {label ? (
          <span className="font-heading text-[clamp(1rem,4vw,2.5rem)] tracking-wide opacity-70">{label}</span>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <circle cx="9" cy="10" r="2" />
            <path d="M21 17l-5-5-9 8" />
          </svg>
        )}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={optimized(src, width)}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
      style={style}
      {...rest}
    />
  );
}
