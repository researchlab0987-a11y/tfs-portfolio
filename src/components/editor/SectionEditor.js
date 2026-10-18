'use client';
/**
 * Section Studio: a split-screen editor with live preview.
 *
 * Desktop: the tools dock on the left (or right; swap button) as a full-height
 * panel and the website moves over to share the screen, so the section being
 * edited stays visible and updates as you type. The panel can be resized by
 * dragging its edge. Phones: the tools dock at the bottom (drag to resize)
 * and the page stays visible above.
 *
 * Settings are split into tabs (Content, Heading, Design, Advanced), each
 * shown as collapsible cards, with a search box that finds any setting.
 * Every change updates a draft that the page renders live; nothing is saved
 * until "Save" (Ctrl+S). "Undo changes" returns to how it was when opened.
 */
import Icon from '@/components/ui/Icon';
import { SheetHandle, useSheetHeight } from '@/components/ui/BottomSheet';
import { useAdmin } from '@/context/AdminContext';
import { copySectionTo, upsertSection } from '@/lib/pageOps';
import { ADVANCED_FIELDS, HEADING_FIELDS, KINDS, STYLE_FIELDS } from '@/lib/sections';
import { usePagesMap } from '@/lib/store';
import { cx, safeLocalStorage } from '@/lib/utils';
import {
  ChevronDown,
  Crosshair,
  Heading,
  Loader2,
  Palette,
  PanelLeft,
  PanelRight,
  PenLine,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FieldList } from './Fields';

const WIDTH_KEY = 'tfs:studio-width';
const SIDE_KEY = 'tfs:studio-side';
const DEFAULT_W = 440;
const MIN_W = 360;

const TABS = [
  { id: 'content', label: 'Content', Icon: PenLine, help: 'What the section says and shows.' },
  { id: 'heading', label: 'Heading', Icon: Heading, help: 'The title above the section and the link below it.' },
  { id: 'design', label: 'Design', Icon: Palette, help: 'Colours, background, spacing, width and motion.' },
  { id: 'advanced', label: 'Advanced', Icon: SlidersHorizontal, help: 'Anchor link, device visibility, custom styling, copying.' },
];

const FIRST_GROUP = { content: 'Main', heading: 'Heading', design: 'Background', advanced: 'Advanced' };

function visible(f, value) {
  if (!f.when) return true;
  try {
    return f.when(value);
  } catch {
    return true;
  }
}

/** Split a flat field list at its { group } markers. */
function toGroups(fields, firstTitle) {
  const groups = [];
  let cur = { title: firstTitle, fields: [] };
  fields.forEach((f) => {
    if (f.group) {
      if (cur.fields.length) groups.push(cur);
      cur = { title: f.group, fields: [] };
    } else cur.fields.push(f);
  });
  if (cur.fields.length) groups.push(cur);
  return groups;
}

function useIsDesktop() {
  const [desk, setDesk] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setDesk(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);
  return desk;
}

export default function SectionEditor() {
  const { sectionEdit, setSectionEdit } = useAdmin();
  const pages = usePagesMap();
  const desktop = useIsDesktop();
  const [tab, setTab] = useState('content');
  const [saving, setSaving] = useState(false);
  const [initial, setInitial] = useState('');
  const [query, setQuery] = useState('');
  const [closed, setClosed] = useState({}); // "tab/group" -> collapsed
  const [width, setWidth] = useState(DEFAULT_W);
  const [side, setSide] = useState('left');
  const [resizing, setResizing] = useState(false);
  const bodyRef = useRef(null);

  const open = Boolean(sectionEdit?.draft);
  const key = sectionEdit ? `${sectionEdit.pageId}/${sectionEdit.sectionId}` : '';
  const draft = sectionEdit?.draft;
  const kind = draft ? KINDS[draft.kind] : null;
  const page = sectionEdit ? pages[sectionEdit.pageId] : null;
  const dirty = Boolean(draft) && JSON.stringify(draft) !== initial;

  const cancelRef = useRef(null);
  const sheet = useSheetHeight('studio', 55, () => cancelRef.current?.());

  // Remembered layout.
  useEffect(() => {
    try {
      const w = Number(safeLocalStorage()?.getItem(WIDTH_KEY));
      if (w >= MIN_W) setWidth(w);
      if (safeLocalStorage()?.getItem(SIDE_KEY) === 'right') setSide('right');
    } catch {
      // Storage blocked: defaults.
    }
  }, []);

  // New section opened: reset the panel.
  useEffect(() => {
    if (!sectionEdit) return;
    setTab('content');
    setQuery('');
    setClosed({});
    setInitial(JSON.stringify(sectionEdit.draft));
    bodyRef.current?.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Split the screen: the site makes room for the panel.
  useEffect(() => {
    if (!open) return undefined;
    const root = document.documentElement;
    root.classList.add('studio-open');
    root.classList.toggle('studio-right', side === 'right');
    root.style.setProperty('--studio-w', `${Math.min(width, Math.round(window.innerWidth * 0.6))}px`);
    root.style.setProperty('--studio-h', `${sheet.height}dvh`);
    return () => {
      root.classList.remove('studio-open', 'studio-right');
      root.style.removeProperty('--studio-w');
      root.style.removeProperty('--studio-h');
    };
  }, [open, side, width, sheet.height]);

  const locate = useCallback(() => {
    if (!sectionEdit) return;
    document.querySelector(`[data-section="${sectionEdit.sectionId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [sectionEdit]);

  // Bring the section into view once the layout has shifted.
  useEffect(() => {
    if (!key) return undefined;
    const t = setTimeout(locate, 360);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const tabs = useMemo(() => (kind ? TABS.filter((t) => t.id !== 'heading' || kind.hasHeading) : []), [kind]);

  const fieldsFor = useCallback(
    (id) => (id === 'content' ? kind?.fields || [] : id === 'heading' ? HEADING_FIELDS : id === 'design' ? STYLE_FIELDS : ADVANCED_FIELDS),
    [kind]
  );

  const setDraft = (next) => setSectionEdit({ ...sectionEdit, draft: next });

  const cancel = () => {
    if (dirty && !window.confirm('Close without saving? Your changes to this section will be lost.')) return;
    setSectionEdit(null);
  };
  cancelRef.current = cancel;

  const undo = () => {
    if (!initial) return;
    setSectionEdit({ ...sectionEdit, draft: JSON.parse(initial) });
    toast('Changes undone');
  };

  const save = async () => {
    if (!page) return toast.error('This tab no longer exists.');
    if (saving) return;
    setSaving(true);
    try {
      const { __draft, ...clean } = draft;
      const r = await upsertSection(page, clean, sectionEdit.index);
      toast.success(sectionEdit.isNew ? 'Section added' : 'Section saved');
      if (r?.queued) toast('Saved on this device. It will sync when the connection returns.');
      setSectionEdit(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };
  const saveRef = useRef(save);
  saveRef.current = save;

  // Ctrl/Cmd+S saves; Escape closes (unless a dialog is open on top).
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveRef.current();
      } else if (e.key === 'Escape' && !document.querySelector('[aria-modal="true"]')) {
        cancelRef.current?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const copyTo = async (pageId) => {
    const target = pages[pageId];
    if (!target) return;
    try {
      const { __draft, ...clean } = draft;
      await copySectionTo(target, clean);
      toast.success(`Copied to “${target.title}”`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const swapSide = () => {
    const next = side === 'left' ? 'right' : 'left';
    setSide(next);
    try {
      safeLocalStorage()?.setItem(SIDE_KEY, next);
    } catch {
      // Not remembered.
    }
  };

  const onResizeDown = (e) => {
    e.preventDefault();
    setResizing(true);
    const move = (ev) => {
      const x = side === 'left' ? ev.clientX : window.innerWidth - ev.clientX;
      setWidth(Math.max(MIN_W, Math.min(Math.round(window.innerWidth * 0.6), Math.round(x))));
    };
    const up = () => {
      setResizing(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setWidth((w) => {
        try {
          safeLocalStorage()?.setItem(WIDTH_KEY, String(w));
        } catch {
          // Not remembered.
        }
        return w;
      });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  if (!sectionEdit || !draft || !kind) return null;

  const title = draft.heading?.title || draft.props?.name || draft.props?.title || '';
  const q = query.trim().toLowerCase();
  const matches = q
    ? tabs
        .map((t) => ({
          tab: t,
          fields: fieldsFor(t.id).filter((f) => !f.group && visible(f, draft) && `${f.label} ${f.help || ''}`.toLowerCase().includes(q)),
        }))
        .filter((m) => m.fields.length)
    : [];
  const groups = toGroups(fieldsFor(tab), FIRST_GROUP[tab]).filter((g) => g.fields.some((f) => visible(f, draft)));
  const currentTab = tabs.find((t) => t.id === tab) || tabs[0];

  const panelStyle = desktop
    ? { width, maxWidth: '60vw' }
    : { height: `${sheet.height}dvh`, paddingBottom: 'env(safe-area-inset-bottom, 0px)' };

  return (
    <aside
      className={cx(
        'ui fixed z-[60] flex flex-col bg-slate-50 shadow-2xl',
        desktop
          ? cx('inset-y-0 border-slate-200', side === 'left' ? 'left-0 border-r' : 'right-0 border-l')
          : 'inset-x-0 bottom-0 rounded-t-2xl border-t border-slate-200',
        (resizing || sheet.dragging) && 'select-none'
      )}
      style={panelStyle}
      aria-label="Section editor"
    >
      {!desktop && (
        <div {...sheet.dragProps} className="shrink-0 cursor-grab">
          <SheetHandle handleProps={sheet.handleProps} className="!pb-0" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#0d7a6f]/10 text-[#0d7a6f]">
          <Icon name={kind.icon} size={18} fallback={<PenLine size={18} />} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-[#0d7a6f]">
            {sectionEdit.isNew ? 'New section' : 'Editing'} · {page?.title || 'Tab'}
          </p>
          <h2 className="truncate text-[15px] font-semibold text-slate-900">
            {kind.label}
            {title && <span className="font-normal text-slate-500"> · {title}</span>}
          </h2>
        </div>
        <button type="button" className="ui-icon-btn" onClick={locate} aria-label="Show this section" data-tip="Find it|Scroll the page to the section you are editing.">
          <Crosshair size={16} />
        </button>
        {desktop && (
          <button
            type="button"
            className="ui-icon-btn"
            onClick={swapSide}
            aria-label={side === 'left' ? 'Move tools to the right' : 'Move tools to the left'}
            data-tip={side === 'left' ? 'Tools on the right|Put this panel on the right side of the screen.' : 'Tools on the left|Put this panel on the left side of the screen.'}
          >
            {side === 'left' ? <PanelRight size={16} /> : <PanelLeft size={16} />}
          </button>
        )}
        <button type="button" className="ui-icon-btn" onClick={cancel} aria-label="Close" data-tip="Close|Asks first if there are unsaved changes. (Esc)">
          <X size={18} />
        </button>
      </div>

      {draft.review && (
        <div className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-[12.5px] text-amber-950">
          <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
          <p className="min-w-0 flex-1">
            <b>Needs review:</b> {draft.review}
          </p>
          <button type="button" className="ui-btn !py-0.5 !text-[12px]" onClick={() => setDraft({ ...draft, review: '' })}>
            Mark as checked
          </button>
        </div>
      )}

      {/* Search + tabs */}
      <div className="space-y-2.5 border-b border-slate-200 bg-white px-4 pb-3 pt-3">
        <label className="relative block">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="ui-input !pl-8" placeholder="Find a setting (e.g. colour, padding, photo)" value={query} onChange={(e) => setQuery(e.target.value)} />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700" aria-label="Clear search">
              <X size={14} />
            </button>
          )}
        </label>
        {!q && (
          <>
            <div className="grid gap-1 rounded-xl bg-slate-100 p-1" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }} role="tablist">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => (setTab(t.id), bodyRef.current?.scrollTo({ top: 0 }))}
                  data-tip={`${t.label}|${t.help}`}
                  className={cx(
                    'flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[11.5px] font-semibold transition',
                    tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  <t.Icon size={15} />
                  {t.label}
                </button>
              ))}
            </div>
            <p className="text-[12px] text-slate-500">{currentTab?.help}</p>
          </>
        )}
      </div>

      {/* Settings */}
      <div ref={bodyRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {q ? (
          matches.length ? (
            matches.map((m) => (
              <section key={m.tab.id} className="rounded-xl border border-slate-200 bg-white">
                <p className="flex items-center gap-1.5 border-b border-slate-100 px-4 py-2.5 text-[12px] font-semibold text-slate-500">
                  <m.tab.Icon size={13} /> {m.tab.label}
                </p>
                <div className="space-y-4 px-4 py-4">
                  <FieldList fields={m.fields} value={draft} onChange={setDraft} ctx={{ section: draft }} />
                </div>
              </section>
            ))
          ) : (
            <p className="px-2 py-8 text-center text-[13px] text-slate-500">No setting matches “{query}”.</p>
          )
        ) : (
          <>
            {groups.map((g) => {
              const id = `${tab}/${g.title}`;
              const isClosed = closed[id];
              return (
                <section key={id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <button
                    type="button"
                    onClick={() => setClosed((c) => ({ ...c, [id]: !c[id] }))}
                    aria-expanded={!isClosed}
                    className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-[13px] font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    {g.title}
                    <ChevronDown size={15} className={cx('text-slate-400 transition-transform', isClosed && '-rotate-90')} />
                  </button>
                  {!isClosed && (
                    <div className="space-y-4 border-t border-slate-100 px-4 py-4">
                      <FieldList fields={g.fields} value={draft} onChange={setDraft} ctx={{ section: draft }} />
                    </div>
                  )}
                </section>
              );
            })}

            {tab === 'advanced' && !sectionEdit.isNew && (
              <section className="rounded-xl border border-slate-200 bg-white px-4 py-4">
                <p className="mb-2 text-[13px] font-semibold text-slate-800">Copy this section to another tab</p>
                <select className="ui-input" value="" onChange={(e) => e.target.value && copyTo(e.target.value)}>
                  <option value="">Choose a tab…</option>
                  {Object.values(pages)
                    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                </select>
              </section>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="space-y-2.5 border-t border-slate-200 bg-white px-4 py-3">
        <p className="flex items-center gap-2 text-[12px] text-slate-600">
          <span className={cx('h-2 w-2 shrink-0 rounded-full', dirty ? 'bg-amber-400' : 'bg-emerald-500')} />
          {dirty ? `Unsaved changes, shown live ${desktop ? `on the ${side === 'left' ? 'right' : 'left'}` : 'above'}` : 'No unsaved changes'}
        </p>
        <div className="flex items-center gap-2">
          <button type="button" className="ui-btn" onClick={undo} disabled={!dirty} data-tip="Undo changes|Go back to how this section was when you opened it.">
            <RotateCcw size={14} /> Undo
          </button>
          <button type="button" className="ui-btn ml-auto" onClick={cancel}>
            Cancel
          </button>
          <button
            type="button"
            className="ui-btn ui-btn-accent"
            onClick={save}
            disabled={saving || (!dirty && !sectionEdit.isNew)}
            data-tip={`${sectionEdit.isNew ? 'Add section' : 'Save'}|Publish this section to the site. Shortcut: Ctrl+S.`}
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {sectionEdit.isNew ? 'Add section' : 'Save'}
          </button>
        </div>
      </div>

      {/* Drag the inner edge to resize (desktop). */}
      {desktop && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize the editor"
          onPointerDown={onResizeDown}
          onDoubleClick={() => setWidth(DEFAULT_W)}
          title="Drag to resize, double-click to reset"
          className={cx('group absolute inset-y-0 flex w-3 cursor-col-resize items-center justify-center', side === 'left' ? '-right-1.5' : '-left-1.5')}
        >
          <span className={cx('h-16 w-1 rounded-full transition-colors', resizing ? 'bg-[#0d7a6f]' : 'bg-slate-300 group-hover:bg-[#0d7a6f]')} />
        </div>
      )}
    </aside>
  );
}
