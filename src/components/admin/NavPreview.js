'use client';
/**
 * Live preview of the navigation bar for the Design panel, drawn from the
 * unsaved draft (`cfg`) with the real tabs, so changes show before saving.
 * The theme variables are already previewed on <html>, so colours match.
 */
import Icon from '@/components/ui/Icon';
import { MARK_SHAPE, navBarProps, navHeight, navIconClass, navLinkClass } from '@/lib/navStyle';
import { navIconFor } from '@/lib/sections';
import { usePages } from '@/lib/store';
import { cx } from '@/lib/utils';
import { useState } from 'react';

export default function NavPreview({ cfg }) {
  const pages = usePages().filter((p) => p.inNav !== false);
  const nav = cfg.nav || {};
  const brand = cfg.brand || {};
  const [scrolled, setScrolled] = useState(false);
  const tabs = pages.slice(0, 5);
  const [active, setActive] = useState(tabs[0]?.id);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="ui-label !mb-0">Preview</p>
        <div className="ui-seg">
          <button type="button" aria-pressed={!scrolled} onClick={() => setScrolled(false)}>
            Top of page
          </button>
          <button type="button" aria-pressed={scrolled} onClick={() => setScrolled(true)}>
            Scrolled
          </button>
        </div>
      </div>
      {/* Page-coloured stage so transparent and frosted styles are visible. */}
      <div
        className="relative overflow-hidden rounded-xl border border-slate-200 bg-bg"
        style={{
          backgroundImage:
            'radial-gradient(circle at 18% 30%, color-mix(in srgb, var(--accent) 55%, transparent) 0 26px, transparent 27px), radial-gradient(circle at 62% 20%, color-mix(in srgb, var(--highlight) 60%, transparent) 0 18px, transparent 19px), repeating-linear-gradient(135deg, transparent 0 14px, color-mix(in srgb, var(--text-primary) 6%, transparent) 14px 15px)',
        }}
      >
        <div className={cx('relative z-10 flex items-center justify-between gap-4 px-4 font-body', navBarProps(nav, scrolled).className)} style={{ height: navHeight(nav), ...navBarProps(nav, scrolled).style }}>
          <span className="flex min-w-0 items-center gap-2">
            {brand.showMark !== false && brand.mark && (
              <span className={cx('grid h-8 w-8 shrink-0 place-items-center border border-line bg-card font-heading text-[0.72rem] font-semibold text-accent', MARK_SHAPE[nav.markShape] || MARK_SHAPE.circle)}>
                {brand.mark}
              </span>
            )}
            <span className="truncate font-heading text-[1rem] font-medium text-ink">{brand.name || cfg.site?.title}</span>
          </span>
          <span className={cx('hidden items-center gap-1 overflow-hidden md:flex', nav.align === 'center' && 'mx-auto')}>
            {tabs.map((p) => {
              const on = p.id === active;
              return (
                <button key={p.id} type="button" onClick={() => setActive(p.id)} className={navLinkClass(nav, on)}>
                  {nav.showIcons !== false && <Icon name={navIconFor(p)} size={15} strokeWidth={1.8} className={cx('shrink-0', navIconClass(nav, on))} />}
                  <span className="whitespace-nowrap">{p.navLabel || p.title}</span>
                </button>
              );
            })}
          </span>
        </div>
        <div className="space-y-2 px-4 py-5" aria-hidden="true">
          <div className="h-3 w-1/3 rounded bg-line" />
          <div className="h-2 w-2/3 rounded bg-line opacity-70" />
        </div>
      </div>
      <p className="ui-help">Click the tabs in the preview to see the current-tab style. Phones always show the compact bar with the menu button.</p>
    </div>
  );
}
