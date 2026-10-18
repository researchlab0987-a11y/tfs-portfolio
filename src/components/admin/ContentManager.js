'use client';
/** Every collection and its items: add, edit, reorder, hide, duplicate, delete. */
import { useAdmin } from '@/context/AdminContext';
import { readItem } from '@/lib/roles';
import { deleteItem, restoreItems, saveItem, saveItems, useCollectionItems, useItemsMap, useSchema } from '@/lib/store';
import { cx, move } from '@/lib/utils';
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, Pencil, Plus, Search, Settings2, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import SchemaEditor from './SchemaEditor';
import { confirmDanger, undoToast } from '@/components/ui/ConfirmDialog';

/**
 * `active`/`onSelect` let the dashboard sidebar choose the list; without them
 * the component manages its own choice.
 */
export default function ContentManager({ active: activeProp, onSelect }) {
  const schema = useSchema();
  const itemsMap = useItemsMap();
  const keys = Object.keys(schema.collections || {}).filter((k) => canList(k));
  const [ownActive, setOwnActive] = useState(keys[0]);
  const active = activeProp || ownActive;
  const setActive = (k) => (onSelect ? onSelect(k) : setOwnActive(k));
  const [query, setQuery] = useState('');
  const [schemaFor, setSchemaFor] = useState(null);
  const { openItemEditor, canList, can } = useAdmin();
  const current = schema.collections?.[active] ? active : keys[0];
  const def = schema.collections?.[current];
  const ordered = useCollectionItems(current, { includeHidden: true, sort: { field: 'order', dir: 'asc' } });

  const counts = useMemo(() => {
    const c = {};
    Object.values(itemsMap).forEach((i) => (c[i.collection] = (c[i.collection] || 0) + 1));
    return c;
  }, [itemsMap]);

  const shown = query ? ordered.filter((i) => JSON.stringify(i).toLowerCase().includes(query.toLowerCase())) : ordered;

  const run = async (fn, msg) => {
    try {
      await fn();
      if (msg) toast.success(msg);
    } catch (err) {
      toast.error(err.message);
    }
  };
  const reorder = (i, dir) => run(() => saveItems(move(ordered, i, i + dir).map((it, idx) => ({ ...it, order: (idx + 1) * 10 }))));

  return (
    <div className="space-y-4">
      {/* On large screens the lists are in the sidebar; here they are chips. */}
      <nav className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:hidden" aria-label="Lists">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => (setActive(k), setQuery(''))}
            className={cx('inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px]', k === current ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white hover:bg-slate-50')}
          >
            {schema.collections[k].label}
            <span className={cx('text-[11px]', k === current ? 'text-slate-300' : 'text-slate-400')}>{counts[k] || 0}</span>
          </button>
        ))}
        {can('lists') && <button type="button" className="inline-flex shrink-0 items-center gap-1 rounded-full border border-dashed border-[#0d7a6f] px-3 py-1.5 text-[13px] font-semibold text-[#0d7a6f]" onClick={() => setSchemaFor('new')} data-tip="New list|Create a new kind of content, e.g. Talks or Students.">
          <Plus size={14} /> New list
        </button>}
      </nav>

      {def && (
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="mr-auto text-lg font-semibold">{def.label}</h2>
            <label className="relative w-full sm:w-auto">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="ui-input !pl-8 sm:!w-56" placeholder="Search" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            {can('lists') && <button type="button" className="ui-btn" onClick={() => setSchemaFor(current)} data-tip="Fields|Choose what information this list stores (title, year, link…) and its name.">
              <Settings2 size={14} /> Fields
            </button>}
            <button type="button" className="ui-btn ui-btn-accent" onClick={() => openItemEditor(current)} data-tip={`Add ${def.singular?.toLowerCase() || 'entry'}|Opens an empty form for a new entry in ${def.label}.`}>
              <Plus size={14} /> Add {def.singular?.toLowerCase()}
            </button>
          </div>
          <p className="text-[12px] text-slate-500">Arrows set the manual order, used by lists sorted “Manual order”.</p>
          <ul className="ui-card divide-y divide-slate-100">
            {shown.length === 0 && <li className="p-6 text-center text-slate-500">No items yet.</li>}
            {shown.map((item) => {
              const r = readItem(item, def);
              const i = ordered.indexOf(item);
              return (
                <li key={item.id} className={cx('flex items-center gap-2 px-3 py-2', item.hidden && 'bg-slate-50 text-slate-400')}>
                  {!query && (
                    <div className="flex flex-col">
                      <button type="button" className="ui-icon-btn !h-5" disabled={i === 0} onClick={() => reorder(i, -1)} aria-label="Move up" data-tip="Move up|Earlier in lists sorted by “Manual order”.">
                        <ArrowUp size={12} />
                      </button>
                      <button type="button" className="ui-icon-btn !h-5" disabled={i === ordered.length - 1} onClick={() => reorder(i, 1)} aria-label="Move down" data-tip="Move down|Later in lists sorted by “Manual order”.">
                        <ArrowDown size={12} />
                      </button>
                    </div>
                  )}
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => openItemEditor(current, item)}>
                    <span className="block truncate font-medium">{r.title}</span>
                    <span className="block truncate text-[12px] text-slate-500">{[r.date, r.subtitle].filter(Boolean).join(' · ')}</span>
                  </button>
                  <button type="button" className="ui-icon-btn" onClick={() => run(() => saveItem({ ...item, hidden: !item.hidden }))} aria-label={item.hidden ? 'Show to visitors' : 'Hide from visitors'} data-tip={item.hidden ? 'Hidden|Visitors cannot see this entry. Click to show it again.' : 'Visible|Click to hide this entry from visitors without deleting it.'}>
                    {item.hidden ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                  <button type="button" className="ui-icon-btn" onClick={() => openItemEditor(current, item)} aria-label="Edit" data-tip="Edit|Change this entry.">
                    <Pencil size={15} />
                  </button>
                  <button type="button" className="ui-icon-btn" onClick={() => run(() => saveItem({ ...item, id: undefined, createdAt: undefined, order: (item.order || 0) + 1 }), 'Duplicated')} aria-label="Duplicate" data-tip="Duplicate|Make a copy to start a similar entry.">
                    <Copy size={15} />
                  </button>
                  <button type="button" className="ui-icon-btn hover:!text-red-600" onClick={async () => {
                      const ok = await confirmDanger({
                        title: `Delete “${r.title || 'this entry'}”?`,
                        message: 'It disappears from every section that shows it and moves to the Bin (Dashboard → Bin), where it can be restored.',
                        note: 'To keep it but stop showing it, use the eye button instead.',
                        phrase: 'delete',
                        confirmLabel: 'Move to Bin',
                      });
                      if (!ok) return;
                      try {
                        await deleteItem(item.id);
                        undoToast('Moved to the Bin', () => restoreItems([item.id]));
                      } catch (err) {
                        toast.error(err.message);
                      }
                    }} aria-label="Delete" data-tip="Delete|Moves this entry to the Bin, where it can be restored. To keep it but hide it, use the eye instead.">
                    <Trash2 size={15} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {schemaFor && <SchemaEditor collectionKey={schemaFor} onClose={() => setSchemaFor(null)} onCreated={(k) => setActive(k)} />}
    </div>
  );
}
