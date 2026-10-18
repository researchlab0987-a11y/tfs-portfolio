/**
 * Navbar look, from config.nav (Dashboard > Design > Navigation bar).
 * Shared by the real navbar and the live preview in the Design panel.
 */
import { cx } from './utils';

export const NAV_TEXT = { sm: 'text-[0.84rem]', md: 'text-[0.9rem]', lg: 'text-[0.98rem]' };
export const MARK_SHAPE = { circle: 'rounded-full', rounded: 'rounded-[10px]', square: 'rounded-none' };

/** Classes for one desktop tab link. */
export function navLinkClass(nav = {}, active = false) {
  const size = NAV_TEXT[nav.textSize] || NAV_TEXT.md;
  switch (nav.tabStyle) {
    case 'underline':
      return cx('nav-pill relative inline-flex items-center gap-2 px-2.5 py-2 font-medium xl:px-3', size, active ? 'nav-underline-active text-ink' : 'text-ink2 hover:text-ink');
    case 'minimal':
      return cx('nav-pill inline-flex items-center gap-2 px-2 py-2 xl:px-2.5', size, active ? 'font-semibold text-accent' : 'font-medium text-ink2 hover:text-ink');
    case 'boxed':
      return cx(
        'nav-pill inline-flex items-center gap-2 rounded-[calc(var(--radius)*0.6)] px-2.5 py-[7px] font-medium xl:px-3.5',
        size,
        active ? 'bg-accent text-accent-contrast' : 'text-ink2 hover:bg-bg2 hover:text-ink'
      );
    default: // pills
      return cx('nav-pill inline-flex items-center gap-2 rounded-full px-2.5 py-[7px] font-medium xl:px-3.5', size, active ? 'nav-pill-active text-ink' : 'text-ink2 hover:bg-bg2 hover:text-ink');
  }
}

/** Icon colour inside a tab. */
export function navIconClass(nav = {}, active = false) {
  if (nav.tabStyle === 'boxed') return active ? '' : 'opacity-75';
  return active ? 'text-accent' : 'opacity-75';
}

/**
 * Colour theme of the bar. Tones re-point the theme variables inside the bar
 * (like section tones), so text, icons and the active tab stay readable.
 */
const THEME_BG = {
  page: { bg: 'var(--base-bg-primary)' },
  soft: { bg: 'var(--base-bg-secondary)' },
  card: { bg: 'var(--base-card-bg)' },
  contrast: { tone: 'tone-contrast', bg: 'var(--bg-primary)' },
  accent: { tone: 'tone-accent', bg: 'var(--bg-primary)' },
};

function hexLum(hex) {
  const c = String(hex || '').replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(c)) return 1;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * className + style for the bar, at the top of the page or scrolled.
 * nav.theme: page | soft | card | contrast | accent | custom (bgColor, textColor)
 * nav.opacity 0-100, nav.blur 0-24 px, nav.topTransparent, nav.divider.
 */
export function navBarProps(nav = {}, scrolled = false) {
  const legacySolid = nav.style === 'solid';
  const clearTop = nav.topTransparent || nav.style === 'transparent';
  const pct = Math.max(0, Math.min(100, Number(nav.opacity ?? (legacySolid ? 100 : scrolled ? 90 : 70))));
  const blur = Math.max(0, Math.min(24, Number(nav.blur ?? (legacySolid ? 0 : scrolled ? 12 : 4))));
  const opacity = clearTop && !scrolled ? 0 : pct;

  const style = {};
  let tone = '';
  if (nav.theme === 'custom' && nav.bgColor) {
    const text = nav.textColor || (hexLum(nav.bgColor) < 0.5 ? '#ffffff' : '#111827');
    Object.assign(style, {
      '--text-primary': text,
      '--text-secondary': `color-mix(in srgb, ${text} 80%, ${nav.bgColor})`,
      '--text-muted': `color-mix(in srgb, ${text} 60%, ${nav.bgColor})`,
      '--bg-secondary': `color-mix(in srgb, ${text} 10%, ${nav.bgColor})`,
      '--card-bg': `color-mix(in srgb, ${text} 6%, ${nav.bgColor})`,
      '--border': `color-mix(in srgb, ${text} 18%, ${nav.bgColor})`,
      '--accent-light': `color-mix(in srgb, ${text} 16%, ${nav.bgColor})`,
      color: text,
    });
    style.background = `color-mix(in srgb, ${nav.bgColor} ${opacity}%, transparent)`;
  } else {
    const t = THEME_BG[nav.theme] || THEME_BG.page;
    tone = t.tone || '';
    style.background = `color-mix(in srgb, ${t.bg} ${opacity}%, transparent)`;
  }
  if (blur && opacity < 100) {
    style.backdropFilter = `blur(${blur}px) saturate(140%)`;
    style.WebkitBackdropFilter = style.backdropFilter;
  }

  const line =
    nav.divider === 'always' ? 'border-line' : nav.divider === 'never' ? 'border-transparent' : scrolled ? 'border-line' : 'border-transparent';
  return { className: cx('border-b', tone, line), style };
}

export const navHeight = (nav = {}) => Math.min(96, Math.max(48, Number(nav.height) || 64));
