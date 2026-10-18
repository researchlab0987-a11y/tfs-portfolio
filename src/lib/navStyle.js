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

/** Classes for the bar itself, before / after the page is scrolled. */
export function navBarClass(nav = {}, scrolled = false) {
  const bg =
    nav.style === 'solid'
      ? 'bg-bg'
      : nav.style === 'transparent'
        ? scrolled
          ? 'bg-bg/90 backdrop-blur-md'
          : 'bg-transparent'
        : scrolled
          ? 'bg-bg/90 backdrop-blur-md'
          : 'bg-bg/70 backdrop-blur-sm';
  const line = nav.divider === 'always' ? 'border-line' : nav.divider === 'never' ? 'border-transparent' : scrolled ? 'border-line' : 'border-transparent';
  return cx('border-b', bg, line);
}

export const navHeight = (nav = {}) => Math.min(96, Math.max(48, Number(nav.height) || 64));
