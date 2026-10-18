'use client';
/** Add or edit one content item, with a form built from its collection's fields. */
import Modal from '@/components/ui/Modal';
import { useAdmin } from '@/context/AdminContext';
import { deleteItem, restoreItems, saveItem, useCollectionDef, useItemsMap } from '@/lib/store';
import { toTags } from '@/lib/utils';
import { CheckCircle2, Eye, Loader2, Plus, Trash2, TriangleAlert, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ImageInput, Label, MultiImageDrop, Toggle } from './Fields';
import { confirmDanger, undoToast } from '@/components/ui/ConfirmDialog';

function GalleryInput({ value, onChange }) {
  const list = Array.isArray(value) ? value : [];
  return (
    <div className="space-y-2">
      {list.map((url, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="flex-1">
            <ImageInput value={url} onChange={(v) => onChange(list.map((u, j) => (j === i ? v : u)))} />
          </div>
          <button type="button" className="ui-icon-btn" onClick={() => onChange(list.filter((_, j) => j !== i))} aria-label="Remove image">
            <X size={14} />
          </button>
        </div>
      ))}
      <MultiImageDrop onAdd={(urls) => onChange([...list, ...urls])} />
      <button type="button" className="text-[12px] font-medium text-slate-500 hover:text-slate-800 hover:underline" onClick={() => onChange([...list, ''])}>
        <Plus size={12} className="mr-0.5 inline" /> Add an empty slot (for a link)
      </button>
    </div>
  );
}

function ItemField({ f, value, set }) {
  switch (f.type) {
    case 'textarea':
      return <textarea className="ui-input" rows={3} value={value ?? ''} onChange={(e) => set(e.target.value)} />;
    case 'markdown':
      return <textarea className="ui-input" rows={6} value={value ?? ''} onChange={(e) => set(e.target.value)} />;
    case 'number':
      return <input type="number" className="ui-input" value={value ?? ''} onChange={(e) => set(e.target.value === '' ? '' : Number(e.target.value))} />;
    case 'date':
      return <input type="date" className="ui-input" value={value ?? ''} onChange={(e) => set(e.target.value)} />;
    case 'image':
      return <ImageInput value={value} onChange={set} />;
    case 'gallery':
      return <GalleryInput value={value} onChange={set} />;
    case 'tags':
      return (
        <>
          <input className="ui-input" value={Array.isArray(value) ? value.join(', ') : value ?? ''} onChange={(e) => set(e.target.value)} onBlur={(e) => set(toTags(e.target.value))} />
          <p className="ui-help">Separate with commas.</p>
        </>
      );
    case 'select':
      return (
        <select className="ui-input" value={value ?? ''} onChange={(e) => set(e.target.value)}>
          <option value="">—</option>
          {(f.options || []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    case 'url':
      return <input type="url" className="ui-input" placeholder="https://…" value={value ?? ''} onChange={(e) => set(e.target.value.trim())} />;
    default:
      return <input className="ui-input" value={value ?? ''} onChange={(e) => set(e.target.value)} />;
  }
}

export default function ItemEditor() {
  const { itemEdit, closeItemEditor } = useAdmin();
  const def = useCollectionDef(itemEdit?.collection);
  const items = useItemsMap();
  const [data, setData] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!itemEdit) return;
    if (itemEdit.item) setData({ ...itemEdit.item });
    else {
      const max = Math.max(0, ...Object.values(items).filter((i) => i.collection === itemEdit.collection).map((i) => Number(i.order) || 0));
      setData({ collection: itemEdit.collection, order: max + 10, hidden: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemEdit]);

  if (!itemEdit || !def) return null;
  const isNew = !itemEdit.item;

  const save = async () => {
    const titleField = def.fields.find((f) => f.role === 'title');
    if (titleField && !String(data[titleField.key] || '').trim()) return toast.error(`${titleField.label} is required.`);
    setSaving(true);
    try {
      const clean = { ...data };
      if (!String(clean.review || '').trim()) delete clean.review;
      def.fields.filter((f) => f.type === 'tags').forEach((f) => (clean[f.key] = toTags(clean[f.key])));
      const r = await saveItem(clean);
      toast.success(isNew ? `${def.singular} added` : 'Saved');
      if (r?.queued) toast('Saved on this device. It will sync when the connection returns.');
      closeItemEditor();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const ok = await confirmDanger({
      title: `Delete this ${def.singular.toLowerCase()}?`,
      message: 'It disappears from every section that shows it and moves to the Bin (Dashboard → Bin), where it can be restored.',
      note: 'To keep it but stop showing it, use “Hidden” instead.',
      phrase: 'delete',
      confirmLabel: 'Move to Bin',
    });
    if (!ok) return;
    const original = items[data.id];
    try {
      await deleteItem(data.id);
      closeItemEditor();
      if (original) undoToast('Moved to the Bin', () => restoreItems([original.id]));
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <Modal
      open
      onClose={closeItemEditor}
      title={`${isNew ? 'Add' : 'Edit'} ${def.singular.toLowerCase()}`}
      footer={
        <>
          {!isNew && (
            <button type="button" className="ui-btn ui-btn-danger mr-auto" onClick={remove}>
              <Trash2 size={14} /> Delete
            </button>
          )}
          <button type="button" className="ui-btn" onClick={closeItemEditor}>
            Cancel
          </button>
          <button type="button" className="ui-btn ui-btn-accent" onClick={save} disabled={saving}>
            {saving && <Loader2 size={14} className="animate-spin" />} {isNew ? 'Add' : 'Save'}
          </button>
        </>
      }
    >
      {data.review && (
        <div className="mb-4 flex flex-wrap items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-950">
          <TriangleAlert size={17} className="mt-0.5 shrink-0 text-amber-600" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Needs review</p>
            <p className="text-amber-900/90">{data.review}</p>
            <p className="mt-1 text-[12px] text-amber-800/80">{data.hidden ? 'Hidden from visitors until it is checked.' : 'Visible to visitors.'}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className="ui-btn !py-1" onClick={() => setData((d) => ({ ...d, review: '' }))} data-tip="Mark as checked|Removes the review note. Press Save to keep it.">
              <CheckCircle2 size={14} /> Mark as checked
            </button>
            {data.hidden && (
              <button type="button" className="ui-btn ui-btn-accent !py-1" onClick={() => setData((d) => ({ ...d, review: '', hidden: false }))} data-tip="Checked and show|Removes the note and makes it visible. Press Save to keep it.">
                <Eye size={14} /> Checked, show it
              </button>
            )}
          </div>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {def.fields.map((f) => (
          <div key={f.key} className={['markdown', 'textarea', 'image', 'gallery'].includes(f.type) || f.role === 'title' ? 'sm:col-span-2' : ''}>
            <Label>{f.label}</Label>
            <ItemField f={f} value={data[f.key]} set={(v) => setData((d) => ({ ...d, [f.key]: v }))} />
          </div>
        ))}
        <div>
          <Label help="Lower numbers come first when a list is in manual order.">Order</Label>
          <input type="number" className="ui-input" value={data.order ?? ''} onChange={(e) => setData((d) => ({ ...d, order: Number(e.target.value) }))} />
        </div>
        <div className="self-end">
          <Toggle label="Hidden from visitors" checked={data.hidden} onChange={(v) => setData((d) => ({ ...d, hidden: v }))} />
        </div>
        <div className="sm:col-span-2">
          <Label help="Only editors see this. Use it for things still to confirm; the entry shows a “Review” badge until it is cleared.">Review note</Label>
          <textarea className="ui-input" rows={2} placeholder="e.g. Confirm the spelling of the name" value={data.review || ''} onChange={(e) => setData((d) => ({ ...d, review: e.target.value }))} />
        </div>
      </div>
    </Modal>
  );
}
