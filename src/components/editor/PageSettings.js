'use client';
/** Create a tab, or change a tab's name, address, header, visibility and SEO. */
import Modal from '@/components/ui/Modal';
import { pageHref } from '@/components/ui/ActionButton';
import { useAdmin } from '@/context/AdminContext';
import Icon from '@/components/ui/Icon';
import { DEFAULT_PAGE_BACKGROUND, DEFAULT_PAGE_HEADER, ICON_CHOICES, navIconFor, PAGE_LOOK_FIELDS, PAGE_TEMPLATES } from '@/lib/sections';
import { deletePage, savePage, usePagesMap, useSchema } from '@/lib/store';
import { slugify } from '@/lib/utils';
import { Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FieldList, Label, Segmented, Toggle } from './Fields';
import { confirmDanger } from '@/components/ui/ConfirmDialog';

const RESERVED = ['admin', 'login', 'api', '_next', 'home'];

export function PageSettingsForm({ pageId, onDone }) {
  const pages = usePagesMap();
  const schema = useSchema();
  const router = useRouter();
  const isNew = pageId === 'new';
  const existing = isNew ? null : pages[pageId];
  const [data, setData] = useState(null);
  const [template, setTemplate] = useState('blank');
  const [collection, setCollection] = useState(Object.keys(schema.collections || {})[0] || '');
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) {
      setData({ id: '', title: '', navLabel: '', inNav: true, hidden: false, header: { show: true, title: '', subtitle: '', align: 'left', tone: 'inherit' }, seo: { title: '', description: '' } });
      setSlugTouched(false);
    } else if (existing) {
      setData({ ...existing, header: { show: true, align: 'left', tone: 'inherit', ...(existing.header || {}) }, seo: { title: '', description: '', ...(existing.seo || {}) } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId]);

  if (!data) return null;
  const set = (patch) => setData((d) => ({ ...d, ...patch }));
  const setHeader = (patch) => setData((d) => ({ ...d, header: { ...d.header, ...patch } }));
  const isHome = existing?.id === 'home';

  const save = async () => {
    const title = data.title.trim();
    if (!title) return toast.error('Give the tab a title.');
    const slug = isHome ? 'home' : slugify(data.id || title);
    if (!slug) return toast.error('The address needs letters or numbers.');
    if (!isHome && RESERVED.includes(slug)) return toast.error(`“${slug}” is reserved. Choose another address.`);
    if (slug !== existing?.id && pages[slug]) return toast.error('Another tab already uses that address.');
    setSaving(true);
    try {
      const order = isNew ? Math.max(0, ...Object.values(pages).map((p) => p.order ?? 0)) + 1 : existing.order;
      const tpl = PAGE_TEMPLATES.find((t) => t.id === template);
      const sections = isNew ? tpl.sections(collection) : existing.sections || [];
      const page = { ...data, id: slug, title, navLabel: data.navLabel.trim() || title, order, sections, header: { ...data.header, title: data.header.title || title } };
      await savePage(page, { previousId: existing?.id });
      toast.success(isNew ? 'Tab created' : 'Tab saved');
      onDone?.();
      if (isNew || slug !== existing?.id) router.push(pageHref(slug));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const ok = await confirmDanger({
      title: 'Delete this tab?',
      message: `The tab “${existing.title}” and its ${(existing.sections || []).length} sections move to the Bin (Dashboard → Bin), where the whole tab can be restored.`,
      note: 'List entries (publications, awards…) are not affected. To only take the tab out of the menu, turn off “Show in the menu” or hide it instead.',
      phrase: existing.title,
      confirmLabel: 'Move tab to Bin',
    });
    if (!ok) return;
    try {
      await deletePage(existing.id);
      toast.success('Tab moved to the Bin');
      onDone?.();
      router.push('/');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Title</Label>
          <input
            className="ui-input"
            value={data.title}
            onChange={(e) => set({ title: e.target.value, ...(isNew && !slugTouched ? { id: slugify(e.target.value) } : {}) })}
            autoFocus
          />
        </div>
        <div>
          <Label>Name in the menu</Label>
          <input className="ui-input" placeholder={data.title} value={data.navLabel} onChange={(e) => set({ navLabel: e.target.value })} />
        </div>
        <div>
          <Label help="Shown next to the name in the menu.">Menu icon</Label>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-700">
              <Icon name={navIconFor({ ...data, id: data.id || slugify(data.title) })} size={16} fallback={<span className="text-xs text-slate-400">—</span>} />
            </span>
            <select className="ui-input" value={data.navIcon || ''} onChange={(e) => set({ navIcon: e.target.value })}>
              <option value="">Automatic</option>
              <option value="none">No icon</option>
              {ICON_CHOICES.filter(Boolean).map((n) => (
                <option key={n} value={n}>
                  {n.replace(/([a-z])([A-Z0-9])/g, '$1 $2')}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="sm:col-span-2">
          <Label help={isHome ? 'The home tab always lives at /.' : 'Letters, numbers and dashes.'}>Address</Label>
          <div className="flex items-center gap-1">
            <span className="text-slate-500">/</span>
            <input className="ui-input" disabled={isHome} value={isHome ? '' : data.id} onChange={(e) => (setSlugTouched(true), set({ id: slugify(e.target.value) }))} />
          </div>
        </div>
        <Toggle label="Show in the menu" checked={data.inNav} onChange={(v) => set({ inNav: v })} />
        {!isHome && <Toggle label="Hide this tab from visitors" checked={data.hidden} onChange={(v) => set({ hidden: v })} />}
      </div>

      {isNew && (
        <div className="ui-group space-y-2">
          <p>Start with</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {PAGE_TEMPLATES.map((t) => (
              <button key={t.id} type="button" onClick={() => setTemplate(t.id)} className={`rounded-lg border p-2.5 text-left ${template === t.id ? 'border-[#0d7a6f] bg-[#ddf1ee]' : 'border-slate-200'}`}>
                <span className="block text-[13px] font-semibold text-slate-900">{t.label}</span>
                <span className="block text-[12px] font-normal text-slate-500">{t.description}</span>
              </button>
            ))}
          </div>
          {PAGE_TEMPLATES.find((t) => t.id === template)?.needsCollection && (
            <select className="ui-input" value={collection} onChange={(e) => setCollection(e.target.value)}>
              {Object.entries(schema.collections || {}).map(([k, c]) => (
                <option key={k} value={k}>
                  {c.label}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      <div className="ui-group space-y-3">
        <p>Title band at the top of the tab</p>
        <Toggle label="Show title band" checked={data.header.show} onChange={(v) => setHeader({ show: v })} />
        {data.header.show && (
          <>
            <div>
              <Label>Heading</Label>
              <input className="ui-input" placeholder={data.title} value={data.header.title} onChange={(e) => setHeader({ title: e.target.value })} />
            </div>
            <div>
              <Label>Introduction</Label>
              <textarea className="ui-input" rows={2} value={data.header.subtitle} onChange={(e) => setHeader({ subtitle: e.target.value })} />
            </div>
            <div className="flex flex-wrap gap-4">
              <div>
                <Label>Alignment</Label>
                <Segmented options={['left', 'center']} value={data.header.align} onChange={(v) => setHeader({ align: v })} />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="ui-group space-y-4">
        <p>Colours and background</p>
        <FieldList
          fields={data.header.show ? PAGE_LOOK_FIELDS : PAGE_LOOK_FIELDS.slice(PAGE_LOOK_FIELDS.findIndex((f) => f.group === 'Background of the whole tab'))}
          value={{ ...data, header: { ...DEFAULT_PAGE_HEADER, ...data.header }, background: { ...DEFAULT_PAGE_BACKGROUND, ...(data.background || {}) } }}
          onChange={(next) => setData(next)}
        />
      </div>

      <div className="ui-group space-y-3">
        <p>Search engines</p>
        <div>
          <Label>Browser title</Label>
          <input className="ui-input" placeholder={`${data.title} | site name`} value={data.seo.title} onChange={(e) => set({ seo: { ...data.seo, title: e.target.value } })} />
        </div>
        <div>
          <Label>Description</Label>
          <textarea className="ui-input" rows={2} value={data.seo.description} onChange={(e) => set({ seo: { ...data.seo, description: e.target.value } })} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-4">
        {!isNew && !isHome && (
          <button type="button" className="ui-btn ui-btn-danger mr-auto" onClick={remove}>
            <Trash2 size={14} /> Delete tab
          </button>
        )}
        <button type="button" className="ui-btn" onClick={onDone}>
          Cancel
        </button>
        <button type="button" className="ui-btn ui-btn-accent" onClick={save} disabled={saving}>
          {saving && <Loader2 size={14} className="animate-spin" />} {isNew ? 'Create tab' : 'Save tab'}
        </button>
      </div>
    </div>
  );
}

export default function PageSettingsDialog() {
  const { pageSettings, setPageSettings } = useAdmin();
  if (!pageSettings) return null;
  return (
    <Modal open onClose={() => setPageSettings(null)} title={pageSettings === 'new' ? 'Add a tab' : 'Tab settings'} size="md">
      <PageSettingsForm pageId={pageSettings} onDone={() => setPageSettings(null)} />
    </Modal>
  );
}
