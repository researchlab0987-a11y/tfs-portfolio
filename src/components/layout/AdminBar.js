'use client';
/**
 * Floating controls for the signed-in editor: edit mode, quick actions for
 * the current tab, dashboard shortcuts, data status and sign out. Visitors
 * never see it.
 *
 * The bar can be dragged by its grip (mouse or touch) and collapsed to a
 * small button. Position and collapsed state are remembered in this browser;
 * double-click the grip to put it back at the bottom centre.
 *
 * Shortcuts: Alt+E toggles edit mode, Alt+B collapses / expands the bar.
 */
import { useAdmin } from '@/context/AdminContext';
import { sectionAllowed } from '@/lib/access';
import { exportData, usePage, useStatus } from '@/lib/store';
import { cx, safeLocalStorage } from '@/lib/utils';
import {
  ChevronDown,
  Cloud,
  CloudOff,
  Download,
  Eye,
  FilePlus2,
  GripVertical,
  HardDrive,
  LayoutDashboard,
  Loader2,
  LogOut,
  Minimize2,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Settings2,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

const POS_KEY = 'tfs:adminbar:pos';
const COLLAPSED_KEY = 'tfs:adminbar:collapsed';
const MARGIN = 8;

export function statusLabel(status) {
  if (status.mode === 'local') return { text: 'Local mode: changes stay in this browser', tone: 'amber', Icon: HardDrive };
  if (status.error) return { text: `Offline: ${status.error}`, tone: 'red', Icon: CloudOff };
  if (status.connected) return { text: 'Live: saving to Firebase', tone: 'green', Icon: Cloud };
  if (status.slow) return { text: 'Database is slow; showing the saved copy', tone: 'amber', Icon: CloudOff };
  return { text: 'Connecting…', tone: 'slate', Icon: Loader2 };
}

const TONES = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-400',
  red: 'bg-red-500',
  slate: 'bg-slate-400',
};

const DASHBOARD_TABS = [
  { id: 'tabs', label: 'Tabs' },
  { id: 'content', label: 'Content' },
  { id: 'design', label: 'Design' },
  { id: 'messages', label: 'Messages' },
  { id: 'data', label: 'Data and backups' },
];

function readJSON(key) {
  try {
    const raw = safeLocalStorage()?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJSON(key, value) {
  try {
    const ls = safeLocalStorage();
    if (value == null) ls?.removeItem(key);
    else ls?.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked: the bar still works, it just forgets its place.
  }
}

function clamp(pos, el) {
  if (!pos || !el || typeof window === 'undefined') return pos;
  const { width, height } = el.getBoundingClientRect();
  const maxX = Math.max(MARGIN, window.innerWidth - width - MARGIN);
  const maxY = Math.max(MARGIN, window.innerHeight - height - MARGIN);
  return { x: Math.min(Math.max(MARGIN, pos.x), maxX), y: Math.min(Math.max(MARGIN, pos.y), maxY) };
}

function timeAgo(ts) {
  if (!ts) return null;
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function downloadBackup() {
  const blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `site-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Drag by a handle; returns the position (null = default spot) and handlers. */
function useDraggable(ref) {
  const [pos, setPos] = useState(null);
  const [dragging, setDragging] = useState(false);
  const start = useRef(null);

  useEffect(() => {
    setPos(readJSON(POS_KEY));
  }, []);

  // Keep the bar on screen when the window or the bar itself changes size.
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const fit = () => setPos((p) => (p ? clamp(p, el) : p));
    fit();
    window.addEventListener('resize', fit);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(el);
    return () => {
      window.removeEventListener('resize', fit);
      ro?.disconnect();
    };
  }, [ref]);

  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    const rect = ref.current.getBoundingClientRect();
    start.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    e.preventDefault();
  };

  const onPointerMove = (e) => {
    if (!start.current) return;
    setPos(clamp({ x: e.clientX - start.current.dx, y: e.clientY - start.current.dy }, ref.current));
  };

  const onPointerUp = (e) => {
    if (!start.current) return;
    start.current = null;
    setDragging(false);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    setPos((p) => (writeJSON(POS_KEY, p), p));
  };

  const reset = () => {
    setPos(null);
    writeJSON(POS_KEY, null);
  };

  // Arrow keys on the focused grip nudge the bar (Shift = bigger steps).
  const onKeyDown = (e) => {
    const step = e.shiftKey ? 40 : 10;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    const rect = ref.current.getBoundingClientRect();
    const next = clamp({ x: rect.left + d[0], y: rect.top + d[1] }, ref.current);
    setPos(next);
    writeJSON(POS_KEY, next);
  };

  return { pos, dragging, reset, handle: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onDoubleClick: reset, onKeyDown } };
}

function useClickOutside(ref, open, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && onClose();
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [ref, open, onClose]);
}

const BTN = 'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400';
const ICON_BTN = 'grid h-8 w-8 place-items-center rounded-full hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400';
const MENU_ITEM = 'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-slate-100 hover:bg-slate-800';

export default function AdminBar() {
  const adminCtx = useAdmin();
  const { isAdmin, editMode, setEditMode, signOut, setPageSettings, setAddSection, sectionEdit, can } = adminCtx;
  const status = useStatus();
  const pathname = usePathname() || '/';
  const barRef = useRef(null);
  const menuRef = useRef(null);
  const { pos, dragging, reset, handle } = useDraggable(barRef);
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [, tick] = useState(0);

  const onDashboard = pathname.startsWith('/admin');
  const slug = pathname === '/' ? 'home' : pathname.split('/')[1];
  const page = usePage(onDashboard ? null : slug);

  useEffect(() => {
    setCollapsed(readJSON(COLLAPSED_KEY) === true);
  }, []);

  // Refresh the "last saved" time now and then.
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const toggleCollapsed = useCallback(() => {
    setMenuOpen(false);
    setCollapsed((c) => (writeJSON(COLLAPSED_KEY, !c), !c));
  }, []);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useClickOutside(menuRef, menuOpen, closeMenu);

  useEffect(() => {
    if (!isAdmin) return undefined;
    const onKey = (e) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const t = e.target;
      if (t?.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t?.tagName || '')) return;
      if (e.code === 'KeyE') {
        e.preventDefault();
        setEditMode(!editMode);
      } else if (e.code === 'KeyB') {
        e.preventDefault();
        toggleCollapsed();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isAdmin, editMode, setEditMode, toggleCollapsed]);

  // The dashboard has these controls in its sidebar.
  // The dashboard and the Section Studio have these controls themselves.
  if (!isAdmin || onDashboard || sectionEdit) return null;

  const s = statusLabel(status);
  const saving = status.pending > 0;
  const synced = timeAgo(status.lastSync);
  const statusText = saving ? `Saving ${status.pending} change${status.pending === 1 ? '' : 's'}…` : s.text;

  // Open the menu towards the larger free side of the screen.
  const openUp = pos ? pos.y > (typeof window !== 'undefined' ? window.innerHeight / 2 : 0) : true;

  const placement = pos
    ? { left: pos.x, top: pos.y }
    : undefined;

  const handleSignOut = () => {
    if (saving && !window.confirm('Some changes are still saving. Sign out anyway?')) return;
    signOut();
  };

  const run = (fn) => () => {
    setMenuOpen(false);
    fn();
  };

  return (
    <div
      ref={barRef}
      style={placement}
      className={cx(
        'ui fixed z-[70] flex select-none items-center gap-1 rounded-full border border-slate-700 bg-slate-900/95 p-1 text-white shadow-2xl backdrop-blur',
        !pos && 'bottom-4 left-1/2 -translate-x-1/2',
        dragging ? 'cursor-grabbing opacity-90 ring-2 ring-amber-400/60' : 'transition-shadow'
      )}
      role="toolbar"
      aria-label="Editor tools"
    >
      <button
        type="button"
        {...handle}
        className={cx(ICON_BTN, 'w-6 touch-none text-slate-400', dragging ? 'cursor-grabbing' : 'cursor-grab')}
        aria-label="Move the editor bar (drag, or use arrow keys; double-click to reset)"
        title="Drag to move · double-click to reset"
      >
        <GripVertical size={14} />
      </button>

      {collapsed ? (
        <button type="button" onClick={toggleCollapsed} className={cx(BTN, 'pl-2')} title="Show editor tools (Alt+B)">
          <span className={cx('h-2 w-2 rounded-full', saving ? 'animate-pulse bg-sky-400' : TONES[s.tone])} />
          {editMode ? <Pencil size={14} className="text-amber-400" /> : <Eye size={14} />}
          <span className="sr-only">Show editor tools</span>
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setEditMode(!editMode)}
            className={cx(
              'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400',
              editMode ? 'bg-amber-400 text-slate-900' : 'hover:bg-slate-800'
            )}
            aria-pressed={editMode}
            title="Toggle edit mode (Alt+E)"
          >
            {editMode ? <Pencil size={14} /> : <Eye size={14} />} {editMode ? 'Editing' : 'Edit page'}
          </button>

          {editMode && page && (
            <>
              {can('sections') && (
                <button type="button" onClick={() => setAddSection({ pageId: page.id, index: page.sections?.length || 0 })} className={ICON_BTN} title="Add a section at the end of this tab" aria-label="Add a section">
                  <Plus size={15} />
                </button>
              )}
              {can('tabs') && (
                <button type="button" onClick={() => setPageSettings(page.id)} className={ICON_BTN} title="Settings for this tab" aria-label="Tab settings">
                  <Settings2 size={14} />
                </button>
              )}
            </>
          )}

          {onDashboard ? (
            <Link href="/" className={BTN} title="Back to the site">
              <Eye size={14} /> <span className="hidden sm:inline">View site</span>
            </Link>
          ) : (
            <Link href="/admin" className={BTN}>
              <LayoutDashboard size={14} /> <span className="hidden sm:inline">Dashboard</span>
            </Link>
          )}

          <span className="inline-flex items-center gap-1.5 px-2 text-[12px] text-slate-300" title={synced && !saving ? `${s.text} · last update ${synced}` : statusText} aria-live="polite">
            {saving ? <Loader2 size={12} className="animate-spin text-sky-400" /> : <span className={cx('h-2 w-2 rounded-full', TONES[s.tone])} />}
            <span className="hidden max-w-[220px] truncate md:inline">{saving ? 'Saving…' : s.text}</span>
          </span>

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className={cx(ICON_BTN, menuOpen && 'bg-slate-800')}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="More tools"
              title="More tools"
            >
              <MoreHorizontal size={15} />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className={cx(
                  'absolute right-0 w-60 rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-2xl',
                  openUp ? 'bottom-full mb-2' : 'top-full mt-2'
                )}
              >
                <p className="px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Dashboard</p>
                {DASHBOARD_TABS.filter((t) => sectionAllowed(t.id, adminCtx)).map((t) => (
                  <Link key={t.id} href={`/admin?tab=${t.id}`} role="menuitem" className={MENU_ITEM} onClick={closeMenu}>
                    <ChevronDown size={13} className="-rotate-90 text-slate-500" /> {t.label}
                  </Link>
                ))}
                <div className="my-1.5 h-px bg-slate-800" />
                {can('tabs') && (
                  <button type="button" role="menuitem" className={MENU_ITEM} onClick={run(() => setPageSettings('new'))}>
                    <FilePlus2 size={14} /> Add a tab
                  </button>
                )}
                {can('backup') && (
                  <button type="button" role="menuitem" className={MENU_ITEM} onClick={run(downloadBackup)}>
                    <Download size={14} /> Download backup
                  </button>
                )}
                <div className="my-1.5 h-px bg-slate-800" />
                <button type="button" role="menuitem" className={MENU_ITEM} onClick={run(toggleCollapsed)}>
                  <Minimize2 size={14} /> Collapse bar <kbd className="ml-auto text-[11px] text-slate-500">Alt+B</kbd>
                </button>
                {pos && (
                  <button type="button" role="menuitem" className={MENU_ITEM} onClick={run(reset)}>
                    <RotateCcw size={14} /> Reset position
                  </button>
                )}
                <p className="px-3 pb-1 pt-2 text-[11px] leading-snug text-slate-500">
                  {s.text}
                  {synced && status.mode !== 'local' ? ` · updated ${synced}` : ''}
                </p>
              </div>
            )}
          </div>

          <button type="button" onClick={handleSignOut} className={ICON_BTN} aria-label="Sign out" title="Sign out">
            <LogOut size={14} />
          </button>
        </>
      )}
    </div>
  );
}
