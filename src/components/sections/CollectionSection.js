'use client';
/**
 * CollectionSection
 *
 * Shows items from any collection in one of six layouts. Layouts work by
 * field role (see lib/roles.js), so a new collection with new fields works in
 * every layout without code changes.
 *
 * Clicking an item opens it in the side panel instead of a new page; the
 * panel gets the list's ids so it can step to the previous/next item.
 */
import Markdown from '@/components/ui/Markdown';
import SafeImage from '@/components/ui/SafeImage';
import { useAdmin } from '@/context/AdminContext';
import { useDrawer } from '@/context/DrawerContext';
import { readItem } from '@/lib/roles';
import { saveItem, sortItems, useCollectionDef, useCollectionItems, useConfig } from '@/lib/store';
import { compareValues, cx } from '@/lib/utils';
import { Eye, EyeOff, Pencil, Plus, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

const str = (v) => (v === undefined || v === null ? '' : String(v));

const DENSITY = { compact: 'py-3', comfortable: 'py-5', airy: 'py-7' };
const GAP = { compact: 'gap-4', comfortable: 'gap-6', airy: 'gap-8' };
const COLS = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};
const MASONRY = { 1: 'columns-1', 2: 'columns-1 sm:columns-2', 3: 'columns-1 sm:columns-2 lg:columns-3', 4: 'columns-2 lg:columns-4' };
const CARD = {
  outline: 'border border-line bg-card',
  filled: 'bg-bg2',
  shadow: 'bg-card shadow-[0_1px_2px_rgba(0,0,0,.04),0_10px_30px_-14px_rgba(0,0,0,.22)]',
  plain: '',
};

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

function OpenTitle({ onOpen, id, children, className = '' }) {
  if (!onOpen) return <span className={className}>{children}</span>;
  // A span with button semantics: unlike <button>, it wraps inline inside a
  // citation sentence. The ::after layer makes the whole entry clickable.
  return (
    <span
      role="button"
      tabIndex={0}
      data-cursor-label="Open details"
      onClick={() => onOpen(id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(id);
        }
      }}
      className={cx(
        'fx-open cursor-pointer after:absolute after:inset-0 after:z-0 after:content-[""] hover:text-accent focus-visible:outline-none focus-visible:after:rounded-[inherit] focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-accent',
        className
      )}
    >
      {children}
    </span>
  );
}

function Tags({ tags }) {
  if (!tags?.length) return null;
  return (
    <ul className="relative z-10 mt-3 flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <li key={t} className="rounded-full border border-line px-2.5 py-0.5 text-[0.78rem] text-ink2">
          {t}
        </li>
      ))}
    </ul>
  );
}

function Links({ links, className = '' }) {
  if (!links?.length) return null;
  return (
    <span className={cx('relative z-10 inline-flex flex-wrap gap-x-3 gap-y-1', className)}>
      {links.map((l) => (
        <a
          key={l.url}
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-[0.85rem] font-medium text-accent underline decoration-1 underline-offset-[3px] hover:decoration-2"
        >
          {l.label}
        </a>
      ))}
    </span>
  );
}

function Body({ text, lines, className = '' }) {
  if (!text) return null;
  const n = Number(lines) || 0;
  return (
    <div className={cx(n > 0 && 'clamp', className)} style={n > 0 ? { WebkitLineClamp: n } : undefined}>
      <Markdown className="text-[0.95rem]">{text}</Markdown>
    </div>
  );
}

function Badge({ children }) {
  if (!children) return null;
  return <span className="inline-block rounded-md bg-accent-light px-1.5 py-0.5 align-middle text-[0.72rem] font-semibold text-accent">{children}</span>;
}

/** Highlights the site owner's name in author lists. */
function Authors({ text, highlight }) {
  if (!highlight || !text.includes(highlight)) return <>{text}</>;
  const parts = text.split(highlight);
  return parts.map((part, i) => (
    <span key={i}>
      {part}
      {i < parts.length - 1 && <strong className="font-semibold text-ink">{highlight}</strong>}
    </span>
  ));
}

function EditControls({ item, collection }) {
  const { openItemEditor } = useAdmin();
  const toggle = async () => {
    try {
      await saveItem({ ...item, hidden: !item.hidden });
    } catch (err) {
      toast.error(err.message);
    }
  };
  return (
    <span className="ui absolute right-2 top-2 z-20 flex gap-1 rounded-lg border border-slate-200 bg-white p-0.5 shadow">
      <button type="button" className="ui-icon-btn !h-7 !w-7" onClick={() => openItemEditor(collection, item)} aria-label="Edit item" title="Edit">
        <Pencil size={13} />
      </button>
      <button type="button" className="ui-icon-btn !h-7 !w-7" onClick={toggle} aria-label={item.hidden ? 'Show item' : 'Hide item'} title={item.hidden ? 'Show' : 'Hide'}>
        {item.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Layouts                                                             */
/* ------------------------------------------------------------------ */

function CitationMode({ items, def, p, onOpen, editMode, highlight }) {
  return (
    <ol className="divide-y divide-line border-y border-line">
      {items.map((item, i) => {
        const r = readItem(item, def, p.hiddenFields);
        const [lead, ...rest] = r.metas;
        const restText = rest.map((m) => m.value).join(', ');
        return (
          <li key={item.id} className={cx('relative grid grid-cols-[2.6rem_1fr] gap-x-3', DENSITY[p.density], item.hidden && 'opacity-50')}>
            <span className="pt-[2px] text-right font-heading text-[0.95rem] tabular-nums text-muted">{p.numbered ? `${i + 1}.` : ''}</span>
            <div className="min-w-0 pr-16">
              <p className="leading-relaxed text-ink2">
                {lead && (
                  <span>
                    <Authors text={lead.value} highlight={highlight} />
                    {', '}
                  </span>
                )}
                <OpenTitle onOpen={onOpen} id={item.id} className="font-medium text-ink">
                  “{r.title}”
                </OpenTitle>
                {r.subtitle && (
                  <>
                    {', '}
                    <em>{r.subtitle}</em>
                  </>
                )}
                {restText && `, ${restText}`}
                {r.date && `, ${r.date}`}.
                {r.badge && (
                  <>
                    {' '}
                    <Badge>{r.badge}</Badge>
                  </>
                )}
              </p>
              {p.showBody && r.body && <Body text={r.body} lines={p.bodyLines} className="mt-2" />}
              {(p.showLinks || p.showTags) && (
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                  {p.showLinks && <Links links={r.links} />}
                  {p.showTags && r.tags.length > 0 && <span className="text-[0.8rem] text-muted">{r.tags.join(', ')}</span>}
                </div>
              )}
            </div>
            {editMode && <EditControls item={item} collection={item.collection} />}
          </li>
        );
      })}
    </ol>
  );
}

function ListMode({ items, def, p, onOpen, editMode }) {
  const twoCol = Number(p.columns) >= 2;
  return (
    <ul className={cx('grid', twoCol ? 'gap-x-10 md:grid-cols-2' : 'grid-cols-1', p.cardStyle === 'plain' || !p.cardStyle ? 'divide-y divide-line' : GAP[p.density])}>
      {items.map((item) => {
        const r = readItem(item, def, p.hiddenFields);
        const boxed = p.cardStyle && p.cardStyle !== 'plain';
        return (
          <li
            key={item.id}
            className={cx(
              'relative flex gap-5',
              boxed ? cx(CARD[p.cardStyle], 'rounded-card p-5') : DENSITY[p.density],
              item.hidden && 'opacity-50'
            )}
          >
            {p.showImages && r.image && (
              <SafeImage src={r.image} alt="" width={400} className="hidden w-28 shrink-0 rounded-[calc(var(--radius)*0.6)] object-cover sm:block" style={{ aspectRatio: p.imageAspect }} />
            )}
            <div className="min-w-0 flex-1">
              {(r.date || r.group) && (
                <p className="mb-1 text-[0.82rem] text-muted">
                  {[r.date, r.group].filter(Boolean).join(', ')}
                </p>
              )}
              <h3 className="font-heading text-[1.25rem] font-medium leading-snug text-ink">
                <OpenTitle onOpen={onOpen} id={item.id}>
                  {r.title}
                </OpenTitle>{' '}
                {r.badge && <Badge>{r.badge}</Badge>}
              </h3>
              {r.subtitle && <p className="mt-1 text-ink2">{r.subtitle}</p>}
              {r.metas.length > 0 && <p className="mt-1 text-[0.9rem] text-muted">{r.metas.map((m) => m.value).join(', ')}</p>}
              {p.showBody && <Body text={r.body} lines={p.bodyLines} className="mt-3" />}
              {p.showTags && <Tags tags={r.tags} />}
              {p.showLinks && <Links links={r.links} className="mt-3" />}
            </div>
            {editMode && <EditControls item={item} collection={item.collection} />}
          </li>
        );
      })}
    </ul>
  );
}

function CardsMode({ items, def, p, onOpen, editMode }) {
  return (
    <ul className={cx('grid', COLS[p.columns] || COLS[3], GAP[p.density])}>
      {items.map((item) => {
        const r = readItem(item, def, p.hiddenFields);
        return (
          <li key={item.id} className={cx('relative flex flex-col overflow-hidden rounded-card transition-colors', CARD[p.cardStyle] || CARD.outline, onOpen && 'hover:border-accent/50', item.hidden && 'opacity-50')}>
            {p.showImages && r.image && (
              <SafeImage src={r.image} alt="" fallbackText={r.title} width={800} className="w-full object-cover" style={{ aspectRatio: p.imageAspect }} />
            )}
            <div className={cx('flex flex-1 flex-col', p.cardStyle === 'plain' ? 'pt-4' : 'p-5 md:p-6')}>
              {(r.date || r.group) && <p className="mb-2 text-[0.82rem] text-muted">{[r.date, r.group].filter(Boolean).join(', ')}</p>}
              <h3 className="font-heading text-[1.22rem] font-medium leading-snug text-ink">
                <OpenTitle onOpen={onOpen} id={item.id}>
                  {r.title}
                </OpenTitle>
              </h3>
              {r.subtitle && <p className="mt-1.5 text-[0.95rem] text-ink2">{r.subtitle}</p>}
              {r.metas.length > 0 && <p className="mt-1 text-[0.88rem] text-muted">{r.metas.map((m) => m.value).join(', ')}</p>}
              {p.showBody && <Body text={r.body} lines={p.bodyLines} className="mt-3" />}
              <div className="mt-auto">
                {p.showTags && <Tags tags={r.tags} />}
                {p.showLinks && <Links links={r.links} className="mt-3" />}
              </div>
            </div>
            {r.badge && <span className="absolute left-3 top-3 z-10"><Badge>{r.badge}</Badge></span>}
            {editMode && <EditControls item={item} collection={item.collection} />}
          </li>
        );
      })}
    </ul>
  );
}

function TimelineMode({ items, def, p, onOpen, editMode }) {
  const pad = { compact: 'pb-6', comfortable: 'pb-10', airy: 'pb-14' }[p.density];
  return (
    <ol className="relative">
      {items.map((item, i) => {
        const r = readItem(item, def, p.hiddenFields);
        const last = i === items.length - 1;
        return (
          <li key={item.id} className={cx('relative md:grid md:grid-cols-[10rem_1fr] md:gap-8', item.hidden && 'opacity-50')}>
            <p className="hidden pt-[3px] text-right text-[0.9rem] tabular-nums text-muted md:block">{r.date}</p>
            <div className={cx('relative border-l pl-7', last ? 'border-transparent' : 'border-line', last ? 'pb-1' : pad)}>
              <span className="absolute -left-[6px] top-[9px] h-[11px] w-[11px] rounded-full border-2 border-accent bg-bg" aria-hidden="true" />
              <p className="mb-1 text-[0.85rem] text-muted md:hidden">{r.date}</p>
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1 pr-14">
                  <h3 className="font-heading text-[1.22rem] font-medium leading-snug text-ink">
                    <OpenTitle onOpen={onOpen} id={item.id}>
                      {r.title}
                    </OpenTitle>{' '}
                    {r.badge && <Badge>{r.badge}</Badge>}
                  </h3>
                  {r.subtitle && <p className="mt-1 text-ink2">{r.subtitle}</p>}
                  {r.metas.length > 0 && <p className="mt-0.5 text-[0.9rem] text-muted">{r.metas.map((m) => m.value).join(', ')}</p>}
                  {p.showBody && <Body text={r.body} lines={p.bodyLines} className="mt-2.5" />}
                  {p.showTags && <Tags tags={r.tags} />}
                  {p.showLinks && <Links links={r.links} className="mt-2" />}
                </div>
                {p.showImages && r.image && (
                  <SafeImage src={r.image} alt="" width={200} className="h-12 w-12 shrink-0 rounded-lg border border-line bg-card object-contain p-1" />
                )}
              </div>
            </div>
            {editMode && <EditControls item={item} collection={item.collection} />}
          </li>
        );
      })}
    </ol>
  );
}

function MinimalMode({ items, def, p, onOpen, editMode }) {
  const pad = { compact: 'py-2.5', comfortable: 'py-3.5', airy: 'py-5' }[p.density];
  return (
    <ul className="border-t border-line">
      {items.map((item) => {
        const r = readItem(item, def, p.hiddenFields);
        return (
          <li key={item.id} className={cx('relative grid grid-cols-[4.5rem_1fr] gap-x-4 border-b border-line sm:grid-cols-[6.5rem_1fr_auto]', pad, item.hidden && 'opacity-50')}>
            <span className="pt-[2px] text-[0.9rem] tabular-nums text-muted">{r.date}</span>
            <div className={cx('min-w-0', editMode && 'pr-16')}>
              <OpenTitle onOpen={onOpen} id={item.id} className="font-medium leading-snug text-ink">
                {r.title}
              </OpenTitle>
              {(r.subtitle || r.metas.length > 0) && (
                <p className="mt-0.5 text-[0.9rem] text-ink2">{[r.subtitle, ...r.metas.map((m) => m.value)].filter(Boolean).join(', ')}</p>
              )}
              {p.showBody && r.body && <Body text={r.body} lines={p.bodyLines} className="mt-1.5" />}
              {p.showLinks && <Links links={r.links} className="mt-1" />}
            </div>
            {(r.badge || (r.group && !p.groupBy)) && (
              <span className="hidden self-start pt-[2px] text-right text-[0.8rem] text-muted sm:block">{r.badge ? <Badge>{r.badge}</Badge> : r.group}</span>
            )}
            {editMode && <EditControls item={item} collection={item.collection} />}
          </li>
        );
      })}
    </ul>
  );
}

function MasonryMode({ items, def, p, onOpen, editMode }) {
  return (
    <ul className={cx(MASONRY[p.columns] || MASONRY[3], 'gap-4 [&>li]:mb-4')}>
      {items.map((item) => {
        const r = readItem(item, def, p.hiddenFields);
        return (
          <li key={item.id} className={cx('relative break-inside-avoid', item.hidden && 'opacity-50')}>
            <figure>
              <SafeImage src={r.image} alt={r.title} fallbackText={r.title} width={900} className="w-full rounded-card object-cover" />
              {(r.title || r.date) && (
                <figcaption className="mt-2 text-[0.9rem] text-ink2">
                  <OpenTitle onOpen={onOpen} id={item.id} className="text-ink">
                    {r.title}
                  </OpenTitle>
                  {r.date && <span className="text-muted">, {r.date}</span>}
                </figcaption>
              )}
            </figure>
            {editMode && <EditControls item={item} collection={item.collection} />}
          </li>
        );
      })}
    </ul>
  );
}

const MODES = { citation: CitationMode, list: ListMode, cards: CardsMode, timeline: TimelineMode, minimal: MinimalMode, masonry: MasonryMode };

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

export function selectItems(all, p) {
  let list = all;
  if (p.selection === 'manual') {
    const byId = new Map(all.map((i) => [i.id, i]));
    list = (p.ids || []).map((id) => byId.get(id)).filter(Boolean);
  } else {
    if (p.selection === 'filter' && p.filterField) {
      const want = str(p.filterValue).toLowerCase();
      list = list.filter((it) => str(it[p.filterField]).toLowerCase() === want);
    }
    if (p.sortField) list = sortItems(list, { field: p.sortField, dir: p.sortDir });
  }
  const limit = Number(p.limit) || 0;
  return limit > 0 ? list.slice(0, limit) : list;
}

function groupItems(list, field, def) {
  if (!field) return [{ key: '', items: list }];
  const fdef = def.fields.find((f) => f.key === field);
  const map = new Map();
  list.forEach((it) => {
    const k = str(it[field]) || 'Other';
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(it);
  });
  let keys = [...map.keys()];
  if (fdef?.options?.length) {
    const order = fdef.options.map(String);
    keys.sort((a, b) => (order.indexOf(a) + 1 || 999) - (order.indexOf(b) + 1 || 999));
  } else if (fdef?.type === 'number' || fdef?.role === 'date') {
    keys.sort((a, b) => compareValues(b, a));
  }
  return keys.map((key) => ({ key, items: map.get(key) }));
}

export default function CollectionSection({ section, editMode }) {
  const p = section.props;
  const def = useCollectionDef(p.collection);
  const all = useCollectionItems(p.collection, { includeHidden: editMode });
  const config = useConfig();
  const drawer = useDrawer();
  const { openItemEditor, canList } = useAdmin();
  const canItems = editMode && canList(p.collection);
  const [query, setQuery] = useState('');
  const [chip, setChip] = useState('');

  const selected = useMemo(() => selectItems(all, p), [all, p]);

  const chipValues = useMemo(() => {
    if (!p.chipsField) return [];
    const values = [...new Set(selected.map((it) => str(it[p.chipsField])).filter(Boolean))];
    const numeric = values.every((v) => !Number.isNaN(Number(v)));
    return values.sort((a, b) => (numeric ? Number(b) - Number(a) : a.localeCompare(b)));
  }, [selected, p.chipsField]);

  const shown = useMemo(() => {
    let list = selected;
    if (chip && p.chipsField) list = list.filter((it) => str(it[p.chipsField]) === chip);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((it) =>
        Object.entries(it).some(([k, v]) => !['id', 'collection'].includes(k) && (typeof v === 'string' || typeof v === 'number' || Array.isArray(v)) && str(v).toLowerCase().includes(q))
      );
    }
    return list;
  }, [selected, chip, query, p.chipsField]);

  if (!def) {
    return editMode ? (
      <p className="ui rounded-lg border border-dashed border-amber-400 bg-amber-50 p-4 text-amber-900">
        The collection “{p.collection}” does not exist. Choose another in this section’s settings.
      </p>
    ) : null;
  }

  const Mode = MODES[p.mode] || ListMode;
  const ids = shown.map((i) => i.id);
  const onOpen = p.clickable ? (id) => drawer.openItem(id, ids) : null;
  const groups = groupItems(shown, p.groupBy, def);
  const highlight = config.person?.citeAs || '';

  return (
    <div>
      {canItems && (
        <div className="ui mb-5">
          <button type="button" className="ui-btn !border-dashed !border-[#0d7a6f] !text-[#0d7a6f]" onClick={() => openItemEditor(p.collection)}>
            <Plus size={14} /> Add {def.singular?.toLowerCase() || 'item'}
          </button>
        </div>
      )}

      {(p.showSearch || chipValues.length > 0) && (
        <div className="mb-8 flex flex-col gap-4">
          {p.showSearch && (
            <label className="relative block max-w-md">
              <span className="sr-only">Search {def.label}</span>
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${def.label.toLowerCase()}`}
                className="w-full rounded-full border border-line bg-card py-2.5 pl-10 pr-10 text-[0.95rem] text-ink placeholder:text-muted focus:border-accent focus:outline-none"
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink" aria-label="Clear search">
                  <X size={16} />
                </button>
              )}
            </label>
          )}
          {chipValues.length > 0 && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter">
              {['', ...chipValues].map((v) => (
                <button
                  key={v || 'all'}
                  type="button"
                  aria-pressed={chip === v}
                  onClick={() => setChip(v)}
                  className={cx(
                    'rounded-full border px-3 py-1 text-[0.85rem] transition-colors',
                    chip === v ? 'border-accent bg-accent text-accent-contrast' : 'border-line text-ink2 hover:border-accent hover:text-accent'
                  )}
                >
                  {v || 'All'}
                </button>
              ))}
            </div>
          )}
          {(query || chip) && <p className="text-[0.85rem] text-muted">{shown.length} of {selected.length} shown</p>}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="text-ink2">{query || chip ? 'No entries match. Try a different search.' : p.emptyText}</p>
      ) : (
        groups.map((g) => (
          <div key={g.key || 'all'} className={cx(g.key && 'mb-12 last:mb-0')}>
            {g.key && (
              <h3 className="mb-4 flex items-baseline gap-3 font-heading text-[1.35rem] font-medium text-ink">
                {g.key}
                <span className="font-body text-[0.85rem] font-normal text-muted">{g.items.length}</span>
              </h3>
            )}
            <Mode items={g.items} def={def} p={p} onOpen={onOpen} editMode={canItems} highlight={highlight} />
          </div>
        ))
      )}
    </div>
  );
}
