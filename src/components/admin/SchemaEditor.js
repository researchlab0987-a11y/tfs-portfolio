'use client';
/**
 * Define a collection: its name and fields. Each field has a type (how it is
 * edited) and a role (how layouts display it). Renaming a field key does not
 * move existing data, so keys are fixed once created.
 */
import { ListEditor, Label } from '@/components/editor/Fields';
import Modal from '@/components/ui/Modal';
import { FIELD_TYPES, ROLES } from '@/lib/roles';
import { purgeItems, saveSchema, useItemsMap, useSchema } from '@/lib/store';
import { requirePassword } from '@/components/ui/PasswordGate';
import { slugify } from '@/lib/utils';
import { Loader2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { confirmDanger } from '@/components/ui/ConfirmDialog';

const FIELD_FIELDS = [
  { key: 'label', label: 'Label', type: 'text' },
  { key: 'key', label: 'Key (stored name, no spaces)', type: 'text', help: 'Changing it later disconnects existing values.' },
  { key: 'type', label: 'Type', type: 'select', options: FIELD_TYPES },
  { key: 'role', label: 'Shown as', type: 'select', options: ROLES },
  { key: 'options', label: 'Choices (one per line, for “Choice” type)', type: 'textarea', rows: 3 },
];

export default function SchemaEditor({ collectionKey, onClose, onCreated }) {
  const schema = useSchema();
  const items = useItemsMap();
  const isNew = collectionKey === 'new';
  const [data, setData] = useState(null);
  const [key, setKey] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) {
      setData({
        label: '',
        singular: '',
        icon: 'Folder',
        citation: false,
        defaultSort: { field: 'order', dir: 'asc' },
        fields: [
          { key: 'title', label: 'Title', type: 'text', role: 'title' },
          { key: 'subtitle', label: 'Subtitle', type: 'text', role: 'subtitle' },
          { key: 'date', label: 'Date', type: 'text', role: 'date' },
          { key: 'description', label: 'Description', type: 'markdown', role: 'body' },
          { key: 'image', label: 'Image', type: 'image', role: 'image' },
          { key: 'link', label: 'Link', type: 'url', role: 'link' },
        ],
      });
      setKey('');
    } else {
      const c = schema.collections?.[collectionKey];
      if (c) setData({ ...c, fields: c.fields.map((f) => ({ ...f, options: Array.isArray(f.options) ? f.options.join('\n') : f.options || '' })) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionKey]);

  if (!data) return null;
  const count = Object.values(items).filter((i) => i.collection === collectionKey).length;

  const save = async () => {
    const finalKey = isNew ? slugify(key || data.label).replace(/-/g, '_') : collectionKey;
    if (!data.label.trim()) return toast.error('Give the collection a name.');
    if (!finalKey) return toast.error('The key needs letters or numbers.');
    if (isNew && schema.collections?.[finalKey]) return toast.error('A collection with that key exists.');
    const fields = data.fields.map((f) => ({
      ...f,
      key: String(f.key || slugify(f.label).replace(/-/g, '_')).trim(),
      options: f.type === 'select' ? String(f.options || '').split('\n').map((o) => o.trim()).filter(Boolean) : undefined,
    }));
    const keys = fields.map((f) => f.key);
    if (keys.some((k) => !k)) return toast.error('Every field needs a key.');
    if (new Set(keys).size !== keys.length) return toast.error('Two fields share a key.');
    if (!fields.some((f) => f.role === 'title')) return toast.error('One field must be shown as “Title”.');
    setSaving(true);
    try {
      const def = { ...data, singular: data.singular || data.label, fields };
      await saveSchema({ ...schema, collections: { ...schema.collections, [finalKey]: def } });
      toast.success(isNew ? 'Collection created' : 'Collection saved');
      if (isNew) onCreated?.(finalKey);
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const ok = await confirmDanger({
      title: 'Delete this whole list?',
      message: `The list “${data.label}” and all ${count} of its entries will be deleted for good. Sections that show it will be empty.`,
      note: 'Download a backup first (Dashboard → Data and backups) if you might want them back.',
      phrase: data.label,
      confirmLabel: 'Continue',
    });
    if (!ok) return;
    const sure = await requirePassword({
      title: 'Delete the list for good',
      message: `Enter your password to permanently delete “${data.label}” and its ${count} entries.`,
      confirmLabel: 'Delete list forever',
    });
    if (!sure) return;
    try {
      const ids = Object.values(items).filter((i) => i.collection === collectionKey).map((i) => i.id);
      if (ids.length) await purgeItems(ids);
      const next = { ...schema.collections };
      delete next[collectionKey];
      await saveSchema({ ...schema, collections: next });
      toast.success('Collection deleted');
      onClose();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={isNew ? 'New collection' : `Fields of “${data.label}”`}
      footer={
        <>
          {!isNew && (
            <button type="button" className="ui-btn ui-btn-danger mr-auto" onClick={remove}>
              <Trash2 size={14} /> Delete collection
            </button>
          )}
          <button type="button" className="ui-btn" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="ui-btn ui-btn-accent" onClick={save} disabled={saving}>
            {saving && <Loader2 size={14} className="animate-spin" />} Save
          </button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Name (plural)</Label>
          <input className="ui-input" value={data.label} onChange={(e) => setData({ ...data, label: e.target.value })} placeholder="Talks" />
        </div>
        <div>
          <Label>One item is called</Label>
          <input className="ui-input" value={data.singular} onChange={(e) => setData({ ...data, singular: e.target.value })} placeholder="Talk" />
        </div>
        {isNew && (
          <div>
            <Label help="Used in the database. Cannot be changed later.">Key</Label>
            <input className="ui-input" value={key} placeholder={slugify(data.label).replace(/-/g, '_')} onChange={(e) => setKey(e.target.value)} />
          </div>
        )}
        <div>
          <Label>Default sort</Label>
          <div className="flex gap-2">
            <select className="ui-input" value={data.defaultSort?.field || 'order'} onChange={(e) => setData({ ...data, defaultSort: { ...data.defaultSort, field: e.target.value } })}>
              <option value="order">Manual order</option>
              {data.fields.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
            <select className="ui-input !w-36" value={data.defaultSort?.dir || 'asc'} onChange={(e) => setData({ ...data, defaultSort: { ...data.defaultSort, dir: e.target.value } })}>
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-[13px] sm:col-span-2">
          <input type="checkbox" checked={Boolean(data.citation)} onChange={(e) => setData({ ...data, citation: e.target.checked })} />
          Offer “Copy citation” and BibTeX in the side panel (uses authors, title, venue, year, doi)
        </label>
      </div>
      <div className="mt-5">
        <Label>Fields</Label>
        <ListEditor
          value={data.fields}
          onChange={(fields) => setData({ ...data, fields })}
          fields={FIELD_FIELDS}
          itemLabel={(f) => `${f.label || 'Field'}  ·  ${f.type}  ·  ${ROLES.find((r) => r.value === f.role)?.label || f.role}`}
          addLabel="Add field"
          newItem={() => ({ key: '', label: 'New field', type: 'text', role: 'meta' })}
        />
      </div>
    </Modal>
  );
}
