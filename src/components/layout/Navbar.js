'use client';
/**
 * Top navigation. Tabs come from the pages collection, in their saved order.
 * Tabs beyond `nav.maxVisible` move into a "More" menu so the bar never wraps.
 * Each tab is a rounded pill with an icon; the current tab is tinted with the
 * theme's accent.
 *
 * On phones the bar shows the menu button and the current tab's name; the
 * name opens "On this page" (the tab's sections). The menu and that list open
 * as bottom sheets that start at half the screen and can be dragged.
 */
import { useAdmin } from '@/context/AdminContext';
import { useDrawer } from '@/context/DrawerContext';
import { useConfig, usePage, usePages } from '@/lib/store';
import { cx } from '@/lib/utils';
import { ChevronDown, ListTree, Menu, Plus } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { pageHref } from '@/components/ui/ActionButton';
import Icon from '@/components/ui/Icon';
import BottomSheet from '@/components/ui/BottomSheet';
import { navIconFor, normalizeSection } from '@/lib/sections';
import { MARK_SHAPE, navBarProps, navHeight, navIconClass, navLinkClass } from '@/lib/navStyle';

function isActive(pathname, slug) {
  const href = pageHref(slug);
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navbar() {
  const config = useConfig();
  const pages = usePages();
  const pathname = usePathname();
  const { editMode: inEdit, setPageSettings, can } = useAdmin();
  const editMode = inEdit && can('tabs'); // only people who manage tabs see “+ Tab”
  const drawer = useDrawer();
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [sectionsOpen, setSectionsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const moreRef = useRef(null);

  const tabs = pages.filter((p) => p.inNav !== false);
  const max = Math.max(2, Number(config.nav?.maxVisible) || 7);
  const visible = tabs.length > max ? tabs.slice(0, max - 1) : tabs;
  const overflow = tabs.length > max ? tabs.slice(max - 1) : [];
  const brand = config.brand || {};

  // The tab being viewed, and its titled sections ("On this page").
  const slug = pathname === '/' ? 'home' : (pathname || '').split('/')[1] || 'home';
  const current = usePage(slug);
  const currentLabel = current ? current.navLabel || current.title : (pathname || '').startsWith('/login') ? 'Sign in' : brand.name || config.site?.title;
  const sections = (current?.sections || [])
    .map(normalizeSection)
    .filter((s) => s && !s.hidden && s.heading?.show !== false && (s.heading?.title || '').trim())
    .map((s) => ({ id: s.id, title: s.heading.title, eyebrow: s.heading.eyebrow }));

  const jumpTo = (id) => {
    setSectionsOpen(false);
    // Wait for the sheet to release the page scroll.
    setTimeout(() => document.querySelector(`[data-section="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setMoreOpen(false);
    setSectionsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return undefined;
    const onDoc = (e) => !moreRef.current?.contains(e.target) && setMoreOpen(false);
    const onKey = (e) => e.key === 'Escape' && setMoreOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [moreOpen]);

  const nav = config.nav || {};
  const linkClass = (active) => navLinkClass(nav, active);
  const showIcons = nav.showIcons !== false;
  const barH = navHeight(nav);
  const bar = navBarProps(nav, scrolled);

  // The bar height is shared with sticky offsets and anchor scrolling.
  useEffect(() => {
    document.documentElement.style.setProperty('--nav-h', `${barH}px`);
  }, [barH]);

  const NavLink = ({ page, className, onClick }) => {
    const active = isActive(pathname, page.id);
    return (
      <Link
        href={pageHref(page.id)}
        onClick={() => {
          drawer.dismiss();
          onClick?.();
        }}
        aria-current={active ? 'page' : undefined}
        className={className || linkClass(active)}
      >
        {showIcons && <Icon name={navIconFor(page)} size={16} strokeWidth={1.8} className={cx('shrink-0', className ? (active ? 'text-accent' : 'opacity-75') : navIconClass(nav, active))} />}
        <span>{page.navLabel || page.title}</span>
      </Link>
    );
  };

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-contrast">
        Skip to content
      </a>
      <header
        className={cx(
          'z-40 w-full transition-[background-color,border-color,box-shadow] duration-300',
          config.nav?.sticky !== false && 'sticky top-0',
          bar.className
        )}
        style={{ height: 'var(--nav-h)', ...bar.style }}
      >
        <nav className="mx-auto flex h-full max-w-site items-center justify-between gap-3 px-3 sm:px-5 md:px-8 lg:gap-6" aria-label="Main">
          {/* Phones: menu button, then the current tab's name (opens its sections). */}
          <div className="flex min-w-0 flex-1 items-center gap-1.5 lg:hidden">
            <button
              type="button"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-ink transition-colors hover:bg-bg2"
              onClick={() => setOpen(true)}
              aria-expanded={open}
              aria-label="Open menu"
            >
              <Menu size={21} />
            </button>
            <button
              type="button"
              onClick={() => sections.length && setSectionsOpen(true)}
              aria-expanded={sectionsOpen}
              aria-label={sections.length ? `${currentLabel}: show the sections on this page` : currentLabel}
              className={cx('flex min-w-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-left', sections.length ? 'hover:bg-bg2' : 'cursor-default')}
            >
              {current && <Icon name={navIconFor(current)} size={16} strokeWidth={1.8} className="shrink-0 text-accent" />}
              <span className="truncate font-heading text-[1.05rem] font-medium text-ink">{currentLabel}</span>
              {sections.length > 0 && (
                <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-bg2 px-1.5 py-0.5 text-[0.72rem] font-semibold text-ink2">
                  {sections.length}
                  <ChevronDown size={13} />
                </span>
              )}
            </button>
          </div>

          <Link href="/" onClick={() => drawer.dismiss()} className="flex min-w-0 shrink-0 items-center gap-2.5 max-lg:order-last lg:shrink" aria-label={brand.name || 'Home'}>
            {brand.showMark !== false && brand.mark && (
              <span className={cx('grid h-9 w-9 shrink-0 place-items-center border border-line bg-card font-heading text-[0.8rem] font-semibold tracking-wide text-accent', MARK_SHAPE[nav.markShape] || MARK_SHAPE.circle)}>
                {brand.mark}
              </span>
            )}
            <span className={cx('truncate font-heading text-[1.12rem] font-medium text-ink', brand.showMark !== false && brand.mark && 'max-lg:hidden')}>{brand.name || config.site?.title}</span>
          </Link>

          <div className={cx('hidden items-center gap-1 lg:flex', config.nav?.align === 'center' && 'mx-auto')}>
            {visible.map((p) => (
              <NavLink key={p.id} page={p} />
            ))}
            {overflow.length > 0 && (
              <div className="relative" ref={moreRef}>
                <button
                  type="button"
                  onClick={() => setMoreOpen((v) => !v)}
                  aria-expanded={moreOpen}
                  className={cx(linkClass(overflow.some((p) => isActive(pathname, p.id))), '!gap-1')}
                >
                  More <ChevronDown size={15} className={cx('transition-transform', moreOpen && 'rotate-180')} />
                </button>
                {moreOpen && (
                  <div className="absolute right-0 top-full mt-2 min-w-[210px] rounded-2xl border border-line bg-card p-1.5 shadow-xl">
                    {overflow.map((p) => (
                      <NavLink
                        key={p.id}
                        page={p}
                        className={cx('flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm', isActive(pathname, p.id) ? 'nav-pill-active text-ink' : 'text-ink2 hover:bg-bg2 hover:text-ink')}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            {editMode && (
              <button type="button" onClick={() => setPageSettings('new')} className="ml-2 inline-flex items-center gap-1 rounded-full border border-dashed border-accent px-2.5 py-1.5 text-xs font-semibold text-accent hover:bg-accent-light">
                <Plus size={14} /> Tab
              </button>
            )}
          </div>

        </nav>
      </header>

      {/* Phone menu: bottom sheet, half the screen by default, drag to resize. */}
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        label="Menu"
        storageKey="menu"
        header={
          <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-1">
            <p className="font-heading text-[1.15rem] font-medium text-ink">Menu</p>
            <p className="truncate text-[0.8rem] text-muted">{brand.name || config.site?.title}</p>
          </div>
        }
      >
        <div className="grid gap-1 px-3 pb-6 pt-1">
          {tabs.map((p) => (
            <NavLink
              key={p.id}
              page={p}
              onClick={() => setOpen(false)}
              className={cx('flex items-center gap-3 rounded-full px-4 py-3 text-[1.02rem]', isActive(pathname, p.id) ? 'nav-pill-active font-semibold text-ink' : 'text-ink2 hover:bg-bg2')}
            />
          ))}
          {editMode && (
            <button
              type="button"
              onClick={() => (setOpen(false), setPageSettings('new'))}
              className="mt-2 inline-flex items-center justify-center gap-1 rounded-full border border-dashed border-accent px-3 py-2.5 text-sm font-semibold text-accent"
            >
              <Plus size={15} /> Add tab
            </button>
          )}
        </div>
      </BottomSheet>

      {/* Phone: the current tab's sections. */}
      <BottomSheet
        open={sectionsOpen}
        onClose={() => setSectionsOpen(false)}
        label={`On this page: ${currentLabel}`}
        storageKey="sections"
        header={
          <div className="flex items-center gap-2 px-5 pb-2 pt-1">
            <ListTree size={17} className="text-accent" />
            <p className="font-heading text-[1.1rem] font-medium text-ink">On this page</p>
            <p className="ml-auto truncate text-[0.8rem] text-muted">{currentLabel}</p>
          </div>
        }
      >
        <ol className="grid gap-1 px-3 pb-6 pt-1">
          <li>
            <button
              type="button"
              onClick={() => (setSectionsOpen(false), setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 60))}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-left text-ink2 hover:bg-bg2"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-bg2 text-[0.75rem] font-semibold">↑</span>
              Top of the page
            </button>
          </li>
          {sections.map((s, i) => (
            <li key={s.id}>
              <button type="button" onClick={() => jumpTo(s.id)} className="flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-left hover:bg-bg2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-light text-[0.75rem] font-semibold text-accent">{i + 1}</span>
                <span className="min-w-0">
                  {s.eyebrow && <span className="block truncate text-[0.72rem] font-medium uppercase tracking-wide text-muted">{s.eyebrow}</span>}
                  <span className="block truncate text-[1rem] text-ink">{s.title}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </BottomSheet>
    </>
  );
}
