'use client';
/**
 * Dashboard frame: a collapsible left sidebar (icons + labels, or icons only
 * with hover labels; a slide-out menu on phones), and a top bar that says
 * what the current section is for, with a "How this works" guide that opens
 * by itself the first time a section is visited. Phones also get a bottom
 * tab bar for the most used sections; "More" opens the full menu.
 */
import { statusLabel } from '@/components/layout/AdminBar';
import { useAdmin } from '@/context/AdminContext';
import { useBin, usePages, useStatus } from '@/lib/store';
import { sectionAllowed } from '@/lib/access';
import { cx, safeLocalStorage } from '@/lib/utils';
import {
  ChevronsLeft,
  ChevronsRight,
  CircleHelp,
  Database,
  ExternalLink,
  FolderOpen,
  Inbox,
  LayoutGrid,
  LayoutPanelTop,
  LogOut,
  Menu,
  MoreHorizontal,
  Palette,
  Pencil,
  Recycle,
  ShieldCheck,
  Crown,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const COLLAPSE_KEY = 'tfs:admin:sidebar-collapsed';
const SEEN_KEY = 'tfs:admin:guide-seen:';

/** Every dashboard section: where it lives in the menu and how to explain it. */
export const SECTIONS = [
  {
    id: 'overview',
    group: null,
    label: 'Overview',
    Icon: LayoutGrid,
    tip: 'Overview|A summary of the site and the quickest ways to get things done.',
    summary: 'Start here: what is on the site, what needs attention, and shortcuts to common jobs.',
    guide: [
      'Use the quick actions to jump straight to the most common jobs.',
      'Work through “Getting started” once; it shows what is already done.',
      'The coloured dot at the bottom of the sidebar shows whether changes are saved online.',
    ],
  },
  {
    id: 'tabs',
    group: 'Website',
    label: 'Tabs (pages)',
    Icon: LayoutPanelTop,
    tip: 'Tabs|The pages in the top menu: add, reorder, rename or hide them.',
    summary: 'The pages of the site, in menu order. Change their names, addresses and visibility here.',
    guide: [
      'Use the arrows to change the order of tabs in the menu.',
      '“Menu” decides whether a tab is listed in the top menu; the eye hides a tab from visitors completely.',
      '“Settings” changes the name, address, menu icon and search-engine text.',
      'To change what is ON a tab, press “Edit the site”, open the tab and use the section toolbars.',
    ],
  },
  {
    id: 'content',
    group: 'Website',
    label: 'Content',
    Icon: FolderOpen,
    tip: 'Content|Publications, projects, awards and other lists shown on the site.',
    summary: 'Lists of things (publications, experience, awards…). Add an entry once and every section that shows that list updates.',
    guide: [
      'Pick a list on the left (or below on phones), then press “Add” to create an entry.',
      'Click an entry to edit it. The eye hides it from visitors without deleting it.',
      'Arrows set the manual order, used when a section sorts by “Manual order”.',
      '“Fields” changes what information a list stores, for example adding a “DOI” field.',
    ],
  },
  {
    id: 'design',
    group: 'Appearance',
    label: 'Design',
    Icon: Palette,
    tip: 'Design|Colours, fonts, menu, motion, contact details and footer.',
    summary: 'How the whole site looks and the details shared by every page. Changes preview live; press “Save design” to keep them.',
    guide: [
      'Choose a theme first, then fine-tune colours if needed.',
      'Everything previews immediately on this page; nothing is public until you press “Save design”.',
      '“Undo” returns to the last saved design.',
      'Use the jump bar at the top to reach a card quickly.',
    ],
  },
  {
    id: 'messages',
    group: 'Inbox',
    label: 'Messages',
    Icon: Inbox,
    tip: 'Messages|Notes sent from the contact form on the site.',
    summary: 'Messages visitors sent through the contact form. Unread ones are highlighted.',
    guide: [
      'Click a message to read it; it is marked as read automatically.',
      '“Reply by email” opens your email app with the address filled in.',
    ],
  },
  {
    id: 'data',
    group: 'Settings',
    label: 'Data and backups',
    Icon: Database,
    tip: 'Data and backups|Download a backup, restore one, and see where content is stored.',
    summary: 'Where the content is stored, plus backups. Download a backup before big changes.',
    guide: [
      '“Download backup” saves every page, list and setting in one file on your computer.',
      '“Restore” replaces everything with a backup file, so use it with care.',
      'Local mode keeps changes in this browser only; live mode saves them online for everyone.',
    ],
  },
  {
    id: 'bin',
    group: 'Settings',
    label: 'Bin',
    Icon: Recycle,
    tip: 'Bin|Deleted tabs, entries and sections. Restore them, or delete forever with your password.',
    summary: 'Everything deleted waits here. Restore it in one click, or delete it forever (needs your password).',
    guide: [
      'Deleting a tab, list entry or section moves it here instead of removing it.',
      '“Restore” puts it back exactly as it was.',
      '“Delete forever” and “Empty the Bin” remove things from the database for good and ask for your password.',
      'The danger zone erases all content; it needs the word ERASE and your password.',
    ],
  },
  {
    id: 'access',
    group: 'Super admin',
    label: 'Access',
    Icon: ShieldCheck,
    tip: 'Access|Add admins and choose exactly what each one can edit.',
    summary: 'Who can edit the site and what each admin is allowed to change. Only you can see this page.',
    guide: [
      'Add an admin with the email they will sign in with, tick what they may edit, and save.',
      'Tick “Create their login…” to email them a link to set their own password.',
      '“Pause” stops someone’s access at once without losing their settings; “Remove” takes it away.',
      'The database rules enforce the same limits, so admins cannot get around them.',
    ],
  },
];

// Bottom bar on phones (everything else is under "More").
const PHONE_BAR = ['overview', 'content', 'tabs', 'design'];

const TONE_DOT = { green: 'bg-emerald-500', amber: 'bg-amber-400', red: 'bg-red-500', slate: 'bg-slate-400' };

function NavItem({ section, active, collapsed, badge, onGo, children }) {
  const { Icon } = section;
  return (
    <li>
      <button
        type="button"
        onClick={() => onGo(section.id)}
        aria-current={active ? 'page' : undefined}
        data-tip={section.tip}
        className={cx(
          'group relative flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[13.5px] font-medium transition-colors',
          active ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white',
          collapsed && 'justify-center px-0'
        )}
      >
        {active && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r bg-emerald-400" aria-hidden="true" />}
        <Icon size={18} className="shrink-0" />
        {!collapsed && <span className="flex-1 truncate">{section.label}</span>}
        {badge > 0 && (
          <span className={cx('grid min-w-[18px] place-items-center rounded-full bg-emerald-500 px-1 text-[10.5px] font-bold text-white', collapsed && 'absolute right-1.5 top-1')}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
        {collapsed && <span className="sr-only">{section.label}</span>}
      </button>
      {children}
    </li>
  );
}

export default function AdminShell({ active, onGo, unread = 0, subnav = null, actions = null, children }) {
  const admin = useAdmin();
  const { signOut, setEditMode, liveMode, user, isSuper } = admin;
  const allowed = SECTIONS.filter((sec) => sectionAllowed(sec.id, admin));
  const status = useStatus();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const section = allowed.find((s) => s.id === active) || allowed[0] || SECTIONS[0];
  const s = statusLabel(status);
  const bin = useBin();
  const livePages = usePages({ includeHidden: true });
  const binCount =
    Object.keys(bin.pages).length + Object.keys(bin.items).length + livePages.reduce((n, p) => n + (p.trash || []).length, 0);

  useEffect(() => {
    try {
      setCollapsed(safeLocalStorage()?.getItem(COLLAPSE_KEY) === '1');
    } catch {
      // Storage blocked: start expanded.
    }
  }, []);

  // First visit to a section: open its guide once.
  useEffect(() => {
    setMobileOpen(false);
    try {
      const ls = safeLocalStorage();
      const seen = ls?.getItem(SEEN_KEY + section.id) === '1';
      setGuideOpen(!seen);
      ls?.setItem(SEEN_KEY + section.id, '1');
    } catch {
      setGuideOpen(false);
    }
  }, [section.id]);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try {
        safeLocalStorage()?.setItem(COLLAPSE_KEY, c ? '0' : '1');
      } catch {
        // Not remembered.
      }
      return !c;
    });
  };

  const editSite = () => {
    setEditMode(true);
    router.push('/');
  };

  const groups = [];
  allowed.forEach((sec) => {
    const g = groups.find((x) => x.name === sec.group);
    if (g) g.items.push(sec);
    else groups.push({ name: sec.group, items: [sec] });
  });

  const sidebar = (isMobile) => {
    const narrow = collapsed && !isMobile;
    return (
      <div className={cx('flex h-full flex-col text-white', isSuper ? 'bg-[#1e1638]' : 'bg-slate-900', narrow ? 'w-[68px]' : 'w-[256px]')}>
        <div className={cx('flex h-14 shrink-0 items-center gap-2 border-b border-white/10', narrow ? 'justify-center px-2' : 'px-4')}>
          {isSuper ? (
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-500 text-white" title="Super admin">
              <Crown size={16} />
            </span>
          ) : (
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-500 text-[13px] font-bold text-slate-900">D</span>
          )}
          {!narrow && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-semibold">{isSuper ? 'Super admin' : 'Dashboard'}</span>
              <span className="block truncate text-[11px] text-slate-400">{user?.email || (liveMode ? 'Signed in' : 'Local editor')}</span>
            </span>
          )}
          {isMobile && (
            <button type="button" onClick={() => setMobileOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-300 hover:bg-white/10" aria-label="Close menu">
              <X size={18} />
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-3" aria-label="Dashboard sections">
          {groups.map((g) => (
            <div key={g.name || 'top'} className="mb-3">
              {g.name && !narrow && <p className="px-2.5 pb-1 pt-1 text-[10.5px] font-bold uppercase tracking-[.08em] text-slate-500">{g.name}</p>}
              {g.name && narrow && <div className="mx-3 mb-2 mt-1 h-px bg-white/10" aria-hidden="true" />}
              <ul className="space-y-0.5">
                {g.items.map((sec) => (
                  <NavItem key={sec.id} section={sec} active={sec.id === active} collapsed={narrow} badge={sec.id === 'messages' ? unread : sec.id === 'bin' ? binCount : 0} onGo={onGo}>
                    {sec.id === active && subnav && !narrow ? <div className="mb-1 ml-[22px] mt-1 border-l border-white/10 pl-2">{subnav}</div> : null}
                  </NavItem>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="shrink-0 space-y-1 border-t border-white/10 p-2.5">
          <button
            type="button"
            onClick={editSite}
            data-tip="Edit the site|Opens the website with editing turned on, so you can change sections right on the page."
            className={cx('flex w-full items-center gap-3 rounded-lg bg-emerald-500 px-2.5 py-2 text-[13.5px] font-semibold text-slate-900 hover:bg-emerald-400', narrow && 'justify-center px-0')}
          >
            <Pencil size={17} className="shrink-0" />
            {!narrow && 'Edit the site'}
            {narrow && <span className="sr-only">Edit the site</span>}
          </button>
          <Link
            href="/"
            data-tip="View site|See the website the way visitors see it."
            className={cx('flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-[13.5px] text-slate-300 hover:bg-white/5 hover:text-white', narrow && 'justify-center px-0')}
          >
            <ExternalLink size={17} className="shrink-0" />
            {!narrow && 'View site'}
            {narrow && <span className="sr-only">View site</span>}
          </Link>
          <div
            className={cx('flex items-center gap-3 rounded-lg px-2.5 py-2 text-[12px] text-slate-400', narrow && 'justify-center px-0')}
            data-tip={`Saving status|${s.text}${status.pending ? ` · ${status.pending} change(s) still saving` : ''}`}
            tabIndex={0}
          >
            <span className={cx('h-2.5 w-2.5 shrink-0 rounded-full', status.pending ? 'animate-pulse bg-sky-400' : TONE_DOT[s.tone])} />
            {!narrow && <span className="truncate">{status.pending ? 'Saving…' : s.text}</span>}
          </div>
          <div className={cx('flex gap-1', narrow && 'flex-col')}>
            <button
              type="button"
              onClick={() => {
                if (status.pending && !window.confirm('Some changes are still saving. Sign out anyway?')) return;
                signOut();
              }}
              data-tip="Sign out|Leave editing on this device."
              className={cx('flex flex-1 items-center gap-3 rounded-lg px-2.5 py-2 text-[13.5px] text-slate-300 hover:bg-white/5 hover:text-white', narrow && 'justify-center px-0')}
            >
              <LogOut size={17} className="shrink-0" />
              {!narrow && 'Sign out'}
              {narrow && <span className="sr-only">Sign out</span>}
            </button>
            {!isMobile && (
              <button
                type="button"
                onClick={toggleCollapsed}
                data-tip={collapsed ? 'Expand sidebar|Show names next to the icons.' : 'Collapse sidebar|Icons only, for more room. Hover an icon to see its name.'}
                className={cx('grid h-9 place-items-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white', narrow ? 'w-full' : 'w-9')}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? <ChevronsRight size={17} /> : <ChevronsLeft size={17} />}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="ui flex min-h-screen bg-slate-100">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen shrink-0 transition-[width] duration-300 lg:block">{sidebar(false)}</aside>

      {/* Phone / tablet slide-out */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[75] lg:hidden" role="dialog" aria-modal="true" aria-label="Dashboard menu">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative h-full w-max shadow-2xl" style={{ animation: 'admin-slide-in .22s ease-out' }}>
            {sidebar(true)}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex min-h-14 flex-wrap items-center gap-3 px-4 py-2.5 md:px-6">
            <button type="button" onClick={() => setMobileOpen(true)} className="ui-icon-btn shrink-0 lg:hidden" aria-label="Open the dashboard menu">
              <Menu size={20} />
            </button>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-slate-400">
                {isSuper && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-1.5 py-px text-[10.5px] font-semibold text-violet-800">
                    <Crown size={10} /> Super admin
                  </span>
                )}
                Dashboard{section.group ? ` / ${section.group}` : ''}
              </p>
              <h1 className="flex items-center gap-2 text-[18px] font-semibold leading-tight text-slate-900">
                <section.Icon size={18} className="text-slate-500" /> {section.label}
              </h1>
            </div>
            {actions}
            <button
              type="button"
              onClick={editSite}
              className="ui-icon-btn shrink-0 !bg-emerald-500 !text-slate-900 lg:hidden"
              aria-label="Edit the site"
              data-tip="Edit the site|Open the website with editing on."
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              onClick={() => setGuideOpen((o) => !o)}
              aria-expanded={guideOpen}
              className={cx('ui-btn', guideOpen && '!border-emerald-300 !bg-emerald-50 !text-emerald-800')}
              data-tip="How this works|Short step-by-step help for this section."
            >
              <CircleHelp size={15} /> <span className="hidden sm:inline">How this works</span>
            </button>
          </div>
          <p className="px-4 pb-2.5 text-[12.5px] leading-snug text-slate-500 md:px-6 md:text-[13px]">{section.summary}</p>
          {guideOpen && (
            <div className="border-t border-emerald-100 bg-emerald-50/70 px-4 py-3 md:px-6">
              <div className="flex items-start gap-3">
                <ol className="flex-1 list-decimal space-y-1 pl-5 text-[13px] text-emerald-950 marker:font-semibold marker:text-emerald-600">
                  {section.guide.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ol>
                <button type="button" onClick={() => setGuideOpen(false)} className="ui-icon-btn !text-emerald-800 hover:!bg-emerald-100" aria-label="Hide these tips">
                  <X size={16} />
                </button>
              </div>
            </div>
          )}
        </header>

        <div className="flex-1 px-3 pb-28 pt-4 sm:px-4 md:px-6 md:py-6 lg:pb-6">
          <div className="mx-auto max-w-6xl">{children}</div>
        </div>
      </div>

      {/* Phones: bottom tab bar. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-[70] grid grid-cols-5 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="Dashboard sections"
      >
        {PHONE_BAR.filter((id) => allowed.some((x) => x.id === id)).map((id) => {
          const sec = SECTIONS.find((x) => x.id === id);
          const on = id === active;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onGo(id)}
              aria-current={on ? 'page' : undefined}
              className={cx('relative flex flex-col items-center gap-0.5 pb-2 pt-2.5 text-[10.5px] font-semibold', on ? 'text-emerald-700' : 'text-slate-500')}
            >
              {on && <span className="absolute inset-x-5 top-0 h-[3px] rounded-b bg-emerald-500" aria-hidden="true" />}
              <sec.Icon size={20} />
              {sec.label.replace(' (pages)', '')}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className={cx('relative flex flex-col items-center gap-0.5 pb-2 pt-2.5 text-[10.5px] font-semibold', PHONE_BAR.includes(active) ? 'text-slate-500' : 'text-emerald-700')}
          aria-label={`More: messages, data and settings${unread ? `, ${unread} unread` : ''}`}
        >
          {!PHONE_BAR.includes(active) && <span className="absolute inset-x-5 top-0 h-[3px] rounded-b bg-emerald-500" aria-hidden="true" />}
          <MoreHorizontal size={20} />
          More
          {unread > 0 && <span className="absolute right-[calc(50%-18px)] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />}
        </button>
      </nav>
    </div>
  );
}
