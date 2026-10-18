'use client';
/**
 * Fields
 *
 * Renders editor forms from the declarations in lib/sections.js. Each field
 * reads and writes one dotted path on the value object, so the same renderer
 * edits a section, a block, a list entry or a stat.
 */
import Icon from '@/components/ui/Icon';
import { blobFromUrl, formatBytes, isPassthrough, MAX_INPUT, prepareAndStore, readTransfer, storeImage } from '@/lib/imagePipeline';
import { ACTIONS, DISPLAY_MODES, ICON_CHOICES } from '@/lib/sections';
import { useCollectionItems, usePages, usePagesMap, useSchema } from '@/lib/store';
import { readItem } from '@/lib/roles';
import { clone, cx, getIn, move, setIn } from '@/lib/utils';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Copy, Crop, ImagePlus, Link2, Loader2, Plus, Trash2, UploadCloud, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import BlocksEditor from './BlocksEditor';
import ImageEditorDialog from './ImageEditorDialog';

const optValue = (o) => (typeof o === 'object' ? o.value : o);
const optLabel = (o) => (typeof o === 'object' ? o.label : String(o));

function safeWhen(when, value) {
  try {
    return when(value);
  } catch {
    return true;
  }
}

export function Label({ children, help, htmlFor }) {
  return (
    <>
      <label className="ui-label" htmlFor={htmlFor}>
        {children}
      </label>
      {help && <p className="ui-help -mt-0.5 mb-1.5">{help}</p>}
    </>
  );
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="ui-seg" role="group">
      {options.map((o) => (
        <button key={String(optValue(o))} type="button" aria-pressed={String(value) === String(optValue(o))} onClick={() => onChange(optValue(o))}>
          {optLabel(o)}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1">
      <span className="text-[13px] font-medium text-slate-700">{label}</span>
      <span className="relative inline-flex">
        <input type="checkbox" className="peer sr-only" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-5 w-9 rounded-full bg-slate-300 transition peer-checked:bg-[#0d7a6f] peer-focus-visible:ring-2 peer-focus-visible:ring-[#0d7a6f]/40" />
        <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

/**
 * Image field: drop a file (or a link) anywhere on it, tap to pick from the
 * device (phones offer the camera and gallery), or paste a screenshot. Every
 * new image goes through the crop-and-resize dialog first.
 */
export function ImageInput({ value, onChange, aspect = 'original', size = 1600 }) {
  const [editing, setEditing] = useState(null); // { blob, name }
  const [busy, setBusy] = useState(0);
  const [over, setOver] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const fileRef = useRef(null);
  const depth = useRef(0);
  const isData = typeof value === 'string' && value.startsWith('data:');

  const openFile = (file) => {
    if (!file) return;
    if (!file.type?.startsWith('image/')) return toast.error('Choose an image file.');
    if (file.size > MAX_INPUT) return toast.error(`Images must be under ${formatBytes(MAX_INPUT)}.`);
    if (isPassthrough(file.type)) return store(file, file.name, file.size);
    setEditing({ blob: file, name: file.name });
  };

  const store = async (blob, name, before) => {
    setBusy(1);
    try {
      const url = await storeImage(blob, name, (p) => setBusy(Math.max(1, p)));
      onChange(url);
      toast.success(before && before > blob.size ? `Image saved: ${formatBytes(before)} → ${formatBytes(blob.size)}` : 'Image saved');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(0);
    }
  };

  const editCurrent = async () => {
    if (!value) return;
    setBusy(1);
    try {
      const blob = await blobFromUrl(value);
      setEditing({ blob, name: value.split('/').pop()?.split('?')[0] || 'image' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(0);
    }
  };

  const onTransfer = (dt) => {
    const { files, url } = readTransfer(dt);
    if (files[0]) openFile(files[0]);
    else if (url) onChange(url);
    else return false;
    return true;
  };

  const dropProps = {
    onDragEnter: (e) => {
      if (!Array.from(e.dataTransfer?.types || []).some((t) => t === 'Files' || t === 'text/uri-list')) return;
      e.preventDefault();
      depth.current += 1;
      setOver(true);
    },
    onDragOver: (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    },
    onDragLeave: () => {
      depth.current = Math.max(0, depth.current - 1);
      if (!depth.current) setOver(false);
    },
    onDrop: (e) => {
      e.preventDefault();
      depth.current = 0;
      setOver(false);
      if (!onTransfer(e.dataTransfer)) toast.error('Drop an image file or an image link.');
    },
    onPaste: (e) => {
      if (e.target.tagName === 'INPUT') return; // let the link box paste normally
      if (onTransfer(e.clipboardData)) e.preventDefault();
    },
  };

  const pick = () => fileRef.current?.click();
  const onZoneKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      pick();
    }
  };

  return (
    <div className="space-y-2" {...dropProps}>
      {value ? (
        <div className={cx('group relative overflow-hidden rounded-lg border bg-[repeating-conic-gradient(#f1f5f9_0_25%,#fff_0_50%)] bg-[length:16px_16px]', over ? 'border-[#0d7a6f] ring-2 ring-[#0d7a6f]/30' : 'border-slate-200')}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" referrerPolicy="no-referrer" className="h-36 w-full object-contain" onError={(e) => (e.currentTarget.style.opacity = '0.2')} />
          {over && <div className="absolute inset-0 grid place-items-center bg-[#0d7a6f]/80 text-sm font-semibold text-white">Drop to replace</div>}
          {busy > 0 && (
            <div className="absolute inset-0 grid place-items-center bg-white/70 text-sm font-semibold text-slate-700">
              <span className="inline-flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" /> {busy > 1 ? `${busy}%` : 'Working…'}
              </span>
            </div>
          )}
          <div className="absolute inset-x-1.5 bottom-1.5 flex flex-wrap justify-end gap-1.5">
            <button type="button" onClick={editCurrent} className="inline-flex items-center gap-1 rounded-md bg-white/95 px-2 py-1 text-xs font-semibold text-slate-800 shadow hover:bg-white" disabled={busy > 0}>
              <Crop size={13} /> Crop
            </button>
            <button type="button" onClick={pick} className="inline-flex items-center gap-1 rounded-md bg-white/95 px-2 py-1 text-xs font-semibold text-slate-800 shadow hover:bg-white" disabled={busy > 0}>
              <ImagePlus size={13} /> Replace
            </button>
            <button type="button" onClick={() => onChange('')} className="rounded-md bg-white/95 p-1 text-slate-700 shadow hover:text-red-600" aria-label="Remove image" title="Remove image">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={pick}
          onKeyDown={onZoneKey}
          className={cx(
            'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d7a6f]/40',
            over ? 'border-[#0d7a6f] bg-[#0d7a6f]/5 text-[#0d7a6f]' : 'border-slate-300 bg-slate-50/60 text-slate-500 hover:border-slate-400 hover:bg-slate-50'
          )}
        >
          {busy > 0 ? <Loader2 size={22} className="animate-spin" /> : <UploadCloud size={24} className={over ? 'text-[#0d7a6f]' : 'text-slate-400'} />}
          <span className="text-[13px] font-semibold text-slate-700">{busy > 0 ? (busy > 1 ? `Uploading ${busy}%` : 'Working…') : over ? 'Drop it here' : 'Drop an image, or tap to choose'}</span>
          <span className="text-[11.5px]">From this device, your phone’s camera or gallery. You can also paste (Ctrl+V).</span>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          openFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {showLink || (value && !isData) ? (
        <input className="ui-input" placeholder="https://… image link" value={isData ? '' : value || ''} onChange={(e) => onChange(e.target.value.trim())} />
      ) : (
        <button type="button" className="text-[12px] font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline" onClick={() => setShowLink(true)}>
          <Link2 size={12} className="mr-1 inline" />
          Use an image link instead
        </button>
      )}

      {editing && (
        <ImageEditorDialog
          blob={editing.blob}
          name={editing.name}
          defaultAspect={aspect}
          defaultSize={size}
          onCancel={() => setEditing(null)}
          onSave={async (r) => {
            const before = editing.blob.size;
            setEditing(null);
            await store(r.blob, editing.name, before);
          }}
        />
      )}
    </div>
  );
}

/** Drop or pick several photos at once; each is optimised and added. */
export function MultiImageDrop({ onAdd }) {
  const [progress, setProgress] = useState(null); // { done, total }
  const [over, setOver] = useState(false);
  const fileRef = useRef(null);

  const run = async (files) => {
    const list = Array.from(files || []).filter((f) => f.type.startsWith('image/'));
    if (!list.length) return toast.error('Choose image files.');
    const urls = [];
    let before = 0;
    let after = 0;
    setProgress({ done: 0, total: list.length });
    for (const [i, f] of list.entries()) {
      try {
        const r = await prepareAndStore(f);
        urls.push(r.url);
        before += r.before;
        after += r.after;
      } catch (err) {
        toast.error(err.message);
      }
      setProgress({ done: i + 1, total: list.length });
    }
    setProgress(null);
    if (urls.length) {
      onAdd(urls);
      toast.success(`${urls.length} image${urls.length === 1 ? '' : 's'} added · ${formatBytes(before)} → ${formatBytes(after)}`);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !progress && fileRef.current?.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), fileRef.current?.click())}
      onDragOver={(e) => (e.preventDefault(), setOver(true))}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!progress) run(readTransfer(e.dataTransfer).files);
      }}
      className={cx(
        'flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-3 text-[13px] font-semibold transition-colors',
        over ? 'border-[#0d7a6f] bg-[#0d7a6f]/5 text-[#0d7a6f]' : 'border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-50'
      )}
    >
      {progress ? (
        <>
          <Loader2 size={15} className="animate-spin" /> Optimising {progress.done + 1 > progress.total ? progress.total : progress.done + 1} of {progress.total}…
        </>
      ) : (
        <>
          <UploadCloud size={16} /> Drop several photos, or tap to choose
        </>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          run(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}

export function ColorInput({ value, onChange }) {
  const hex = /^#[0-9a-f]{6}$/i.test(value || '') ? value : '#888888';
  return (
    <div className="flex items-center gap-2">
      <input type="color" value={hex} onChange={(e) => onChange(e.target.value)} className="h-8 w-10 cursor-pointer rounded border border-slate-300 bg-white p-0.5" />
      <input className="ui-input ui-mono" placeholder="#000000 or empty" value={value || ''} onChange={(e) => onChange(e.target.value.trim())} />
      {value && (
        <button type="button" className="ui-icon-btn" onClick={() => onChange('')} aria-label="Clear colour">
          <X size={14} />
        </button>
      )}
    </div>
  );
}

function IconSelect({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-slate-200 text-slate-700">
        <Icon name={value} size={16} fallback={<span className="text-[10px] text-slate-400">none</span>} />
      </span>
      <select className="ui-input" value={value || ''} onChange={(e) => onChange(e.target.value)}>
        {ICON_CHOICES.map((n) => (
          <option key={n || 'none'} value={n}>
            {n || 'No icon'}
          </option>
        ))}
      </select>
    </div>
  );
}

function PageSelect({ value, onChange }) {
  const pages = usePages({ includeHidden: true });
  return (
    <select className="ui-input" value={value || ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">Choose a tab…</option>
      {pages.map((p) => (
        <option key={p.id} value={p.id}>
          {p.title}
        </option>
      ))}
    </select>
  );
}

function AnchorInput({ value, onChange }) {
  const pages = usePagesMap();
  const anchors = useMemo(
    () => [...new Set(Object.values(pages).flatMap((p) => (p.sections || []).map((s) => s.style?.anchor).filter(Boolean)))],
    [pages]
  );
  return (
    <>
      <input className="ui-input" list="tfs-anchors" placeholder="about" value={value || ''} onChange={(e) => onChange(e.target.value.replace(/^#/, ''))} />
      <datalist id="tfs-anchors">
        {anchors.map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>
    </>
  );
}

function ActionTarget({ action, value, onChange }) {
  if (action === 'drawer' || action === 'page') return <PageSelect value={value} onChange={onChange} />;
  if (action === 'scroll') return <AnchorInput value={value} onChange={onChange} />;
  return <input className="ui-input" placeholder={action === 'email' ? 'name@example.com' : 'https://…'} value={value || ''} onChange={(e) => onChange(e.target.value)} />;
}

function CollectionSelect({ value, onChange, allowNone }) {
  const schema = useSchema();
  return (
    <select className="ui-input" value={value || ''} onChange={(e) => onChange(e.target.value)}>
      {allowNone && <option value="">None (fixed number)</option>}
      {Object.entries(schema.collections || {}).map(([k, c]) => (
        <option key={k} value={k}>
          {c.label}
        </option>
      ))}
    </select>
  );
}

function useCollectionFields(root) {
  const schema = useSchema();
  return schema.collections?.[getIn(root, 'props.collection')]?.fields || [];
}

function FieldSelect({ root, value, onChange, allowOrder, allowNone }) {
  const fields = useCollectionFields(root);
  return (
    <select className="ui-input" value={value || ''} onChange={(e) => onChange(e.target.value)}>
      {allowNone && <option value="">None</option>}
      {!allowNone && <option value="">Default order</option>}
      {allowOrder && <option value="order">Manual order (as arranged in Content)</option>}
      {fields
        .filter((f) => !['image', 'gallery', 'markdown'].includes(f.type))
        .map((f) => (
          <option key={f.key} value={f.key}>
            {f.label}
          </option>
        ))}
    </select>
  );
}

function FieldValue({ root, fieldPath, value, onChange }) {
  const fields = useCollectionFields(root);
  const f = fields.find((x) => x.key === getIn(root, fieldPath));
  if (f?.options?.length) {
    return (
      <select className="ui-input" value={value || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choose…</option>
        {f.options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }
  return <input className="ui-input" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
}

function FieldMulti({ root, value = [], onChange }) {
  const fields = useCollectionFields(root);
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
      {fields.map((f) => (
        <label key={f.key} className="flex items-center gap-2 text-[13px] text-slate-700">
          <input
            type="checkbox"
            checked={value.includes(f.key)}
            onChange={(e) => onChange(e.target.checked ? [...value, f.key] : value.filter((k) => k !== f.key))}
          />
          {f.label}
        </label>
      ))}
    </div>
  );
}

function ItemsPicker({ root, value = [], onChange }) {
  const key = getIn(root, 'props.collection');
  const schema = useSchema();
  const def = schema.collections?.[key];
  const all = useCollectionItems(key, { includeHidden: true });
  const byId = new Map(all.map((i) => [i.id, i]));
  const title = (id) => (byId.get(id) && def ? readItem(byId.get(id), def).title : '(deleted)');
  const available = all.filter((i) => !value.includes(i.id));
  return (
    <div className="space-y-2">
      {value.length === 0 && <p className="ui-help">Nothing picked yet.</p>}
      <ol className="space-y-1">
        {value.map((id, i) => (
          <li key={id} className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[12.5px]">
            <span className="w-5 text-slate-400">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate">{title(id)}</span>
            <button type="button" className="ui-icon-btn !h-6 !w-6" disabled={i === 0} onClick={() => onChange(move(value, i, i - 1))} aria-label="Up">
              <ArrowUp size={13} />
            </button>
            <button type="button" className="ui-icon-btn !h-6 !w-6" disabled={i === value.length - 1} onClick={() => onChange(move(value, i, i + 1))} aria-label="Down">
              <ArrowDown size={13} />
            </button>
            <button type="button" className="ui-icon-btn !h-6 !w-6" onClick={() => onChange(value.filter((x) => x !== id))} aria-label="Remove">
              <X size={13} />
            </button>
          </li>
        ))}
      </ol>
      <select className="ui-input" value="" onChange={(e) => e.target.value && onChange([...value, e.target.value])}>
        <option value="">Add an item…</option>
        {available.map((i) => (
          <option key={i.id} value={i.id}>
            {def ? readItem(i, def).title : i.id}
          </option>
        ))}
      </select>
    </div>
  );
}

function ModePicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {DISPLAY_MODES.map((m) => (
        <button
          key={m.value}
          type="button"
          aria-pressed={value === m.value}
          onClick={() => onChange(m.value)}
          className={cx('rounded-lg border p-2 text-left transition', value === m.value ? 'border-[#0d7a6f] bg-[#ddf1ee]' : 'border-slate-200 hover:border-slate-400')}
        >
          <span className="block text-[12.5px] font-semibold">{m.label}</span>
          <span className="block text-[11px] leading-snug text-slate-500">{m.hint}</span>
        </button>
      ))}
    </div>
  );
}

/** A repeatable list of objects, each edited with its own sub-fields. */
export function ListEditor({ value = [], onChange, fields, itemLabel, addLabel = 'Add', newItem, ctx }) {
  const [open, setOpen] = useState(null);
  const list = Array.isArray(value) ? value : [];
  const update = (i, next) => onChange(list.map((x, j) => (j === i ? next : x)));
  return (
    <div className="space-y-1.5">
      {list.map((entry, i) => (
        <div key={i} className="rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center gap-1 px-1.5 py-1">
            <button type="button" className="flex min-w-0 flex-1 items-center gap-1.5 px-1 py-1 text-left text-[13px] font-medium" onClick={() => setOpen(open === i ? null : i)}>
              {open === i ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span className="truncate">{itemLabel ? itemLabel(entry) : `Item ${i + 1}`}</span>
            </button>
            <button type="button" className="ui-icon-btn !h-7 !w-7" disabled={i === 0} onClick={() => onChange(move(list, i, i - 1))} aria-label="Move up">
              <ArrowUp size={13} />
            </button>
            <button type="button" className="ui-icon-btn !h-7 !w-7" disabled={i === list.length - 1} onClick={() => onChange(move(list, i, i + 1))} aria-label="Move down">
              <ArrowDown size={13} />
            </button>
            <button type="button" className="ui-icon-btn !h-7 !w-7" onClick={() => onChange([...list.slice(0, i + 1), clone(entry), ...list.slice(i + 1)])} aria-label="Duplicate">
              <Copy size={13} />
            </button>
            <button type="button" className="ui-icon-btn !h-7 !w-7 hover:!text-red-600" onClick={() => onChange(list.filter((_, j) => j !== i))} aria-label="Remove">
              <Trash2 size={13} />
            </button>
          </div>
          {open === i && (
            <div className="space-y-3 border-t border-slate-100 p-3">
              <FieldList fields={fields} value={entry} onChange={(next) => update(i, next)} ctx={ctx} />
            </div>
          )}
        </div>
      ))}
      <button
        type="button"
        className="ui-btn w-full !border-dashed"
        onClick={() => {
          onChange([...list, newItem ? newItem() : {}]);
          setOpen(list.length);
        }}
      >
        <Plus size={14} /> {addLabel}
      </button>
    </div>
  );
}

function Field({ f, value, set, root, ctx }) {
  const id = `f-${f.key}`;
  switch (f.type) {
    case 'toggle':
      return (
        <div>
          <Toggle checked={value} onChange={set} label={f.label} />
          {f.help && <p className="ui-help">{f.help}</p>}
        </div>
      );
    case 'text':
      return <input id={id} className="ui-input" value={value ?? ''} placeholder={f.placeholder} onChange={(e) => set(e.target.value)} />;
    case 'textarea':
      return <textarea id={id} className="ui-input" rows={f.rows || 3} value={value ?? ''} onChange={(e) => set(e.target.value)} />;
    case 'markdown':
      return (
        <>
          <textarea id={id} className="ui-input" rows={f.rows || 6} value={value ?? ''} onChange={(e) => set(e.target.value)} />
          <p className="ui-help">**bold**, _italic_, [link](https://…), - list, ### small heading</p>
        </>
      );
    case 'code':
      return <textarea id={id} className="ui-input ui-mono" rows={f.rows || 6} spellCheck={false} value={value ?? ''} onChange={(e) => set(e.target.value)} />;
    case 'number':
      return <input id={id} type="number" className="ui-input" min={f.min} max={f.max} step={f.step || 1} value={value ?? ''} onChange={(e) => set(e.target.value === '' ? '' : Number(e.target.value))} />;
    case 'range':
      return (
        <div className="flex items-center gap-3">
          <input id={id} type="range" className="w-full accent-[#0d7a6f]" min={f.min} max={f.max} step={f.step || 1} value={Number(value ?? f.min)} onChange={(e) => set(Number(e.target.value))} />
          <input type="number" className="ui-input !w-20" min={f.min} max={f.max} step={f.step || 1} value={value ?? ''} onChange={(e) => set(Number(e.target.value))} />
        </div>
      );
    case 'select':
      return (
        <select id={id} className="ui-input" value={value ?? ''} onChange={(e) => set(e.target.value)}>
          {f.options.map((o) => (
            <option key={String(optValue(o))} value={optValue(o)}>
              {optLabel(o)}
            </option>
          ))}
        </select>
      );
    case 'segmented':
      return (
        <Segmented
          options={f.options}
          value={value}
          onChange={(v) => {
            const first = f.options[0];
            set(typeof optValue(first) === 'number' ? Number(v) : v);
          }}
        />
      );
    case 'color':
      return <ColorInput value={value} onChange={set} />;
    case 'image':
      return <ImageInput value={value} onChange={set} />;
    case 'icon':
      return <IconSelect value={value} onChange={set} />;
    case 'page':
      return <PageSelect value={value} onChange={set} />;
    case 'action-target':
      return <ActionTarget action={root?.action} value={value} onChange={set} />;
    case 'collection':
      return <CollectionSelect value={value} onChange={set} allowNone={f.allowNone} />;
    case 'field':
      return <FieldSelect root={ctx?.section || root} value={value} onChange={set} allowOrder={f.allowOrder} allowNone={f.allowNone} />;
    case 'field-value':
      return <FieldValue root={ctx?.section || root} fieldPath={f.fieldPath} value={value} onChange={set} />;
    case 'field-multi':
      return <FieldMulti root={ctx?.section || root} value={value || []} onChange={set} />;
    case 'items':
      return <ItemsPicker root={ctx?.section || root} value={value || []} onChange={set} />;
    case 'mode':
      return <ModePicker value={value} onChange={set} />;
    case 'list':
      return <ListEditor value={value} onChange={set} fields={f.fields} itemLabel={f.itemLabel} addLabel={f.addLabel} newItem={f.newItem} ctx={ctx} />;
    case 'blocks':
      return <BlocksEditor value={value || []} onChange={set} />;
    default:
      return <input className="ui-input" value={value ?? ''} onChange={(e) => set(e.target.value)} />;
  }
}

/** Render a list of field declarations against a value object. */
export function FieldList({ fields, value, onChange, ctx }) {
  return (
    <>
      {fields.map((f, i) => {
        if (f.group) {
          return (
            <div key={`g-${f.group}-${i}`} className="ui-group">
              {f.group}
            </div>
          );
        }
        if (f.when && !safeWhen(f.when, value)) return null;
        const v = getIn(value, f.key);
        const set = (next) => onChange(setIn(value, f.key, next));
        return (
          <div key={f.key}>
            {f.type !== 'toggle' && (
              <Label htmlFor={`f-${f.key}`} help={f.type === 'list' || f.type === 'blocks' ? f.help : undefined}>
                {f.label}
              </Label>
            )}
            <Field f={f} value={v} set={set} root={value} ctx={ctx} />
            {f.help && f.type !== 'toggle' && f.type !== 'list' && f.type !== 'blocks' && <p className="ui-help">{f.help}</p>}
          </div>
        );
      })}
    </>
  );
}
