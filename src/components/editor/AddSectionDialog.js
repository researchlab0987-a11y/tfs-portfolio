'use client';
/**
 * Choose what to add:
 *   - Recently deleted sections of this tab (restore with one click),
 *   - "Your lists": a ready section for every content list (Publications,
 *     Collaborators…), so a deleted list section is one click to bring back,
 *   - templates, or a copy of a section from any tab.
 * Templates, lists and copies open as an unsaved draft in the Section Studio.
 */
import Icon from '@/components/ui/Icon';
import Modal from '@/components/ui/Modal';
import { useAdmin } from '@/context/AdminContext';
import { forgetDeleted, restoreSection } from '@/lib/pageOps';
import { createSection, KINDS, normalizeSection, TEMPLATE_GROUPS, TEMPLATES } from '@/lib/sections';
import { usePage, usePages, useSchema } from '@/lib/store';
import { clone, cx, uid } from '@/lib/utils';
import { ArchiveRestore, Trash2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { requirePassword } from '@/components/ui/PasswordGate';

/** The layout a list looks best in by default. */
function modeFor(key, def) {
  const k = `${key} ${def.label}`.toLowerCase();
  if (/publication|paper|article/.test(k)) return { mode: 'citation', sortField: 'year', sortDir: 'desc', showSearch: true };
  if (/gallery|photo/.test(k)) return { mode: 'masonry', columns: 3 };
  if (/experience|education|career|timeline/.test(k)) return { mode: 'timeline' };
  if (/award|grant|news|honou?r/.test(k)) return { mode: 'minimal' };
  if (/collaborat|team|member|student|people|research|project/.test(k)) return { mode: 'cards', columns: /collaborat|team|member|student|people/.test(k) ? 2 : 3 };
  return { mode: 'list' };
}

const ago = (t) => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(t).toLocaleDateString();
};

export default function AddSectionDialog() {
  const { addSection, setAddSection, setSectionEdit } = useAdmin();
  const pages = usePages({ includeHidden: true });
  const page = usePage(addSection?.pageId || '__none__');
  const schema = useSchema();
  const [group, setGroup] = useState('All');
  const [busy, setBusy] = useState(0);

  if (!addSection) return null;

  const start = (section) => {
    setSectionEdit({ pageId: addSection.pageId, sectionId: section.id, draft: section, isNew: true, index: addSection.index });
    setAddSection(null);
  };

  const restore = async (entry) => {
    setBusy(entry.deletedAt);
    try {
      await restoreSection(page, entry.deletedAt, addSection.index);
      toast.success('Section restored');
      setAddSection(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(0);
    }
  };

  const forget = async (entry) => {
    const ok = await requirePassword({
      title: 'Delete this section forever?',
      message: `Enter your password to permanently remove “${entry.section.heading?.title || KINDS[entry.section.kind]?.label || 'this section'}” from Recently deleted.`,
    });
    if (!ok) return;
    try {
      await forgetDeleted(page, entry.deletedAt);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const trash = page?.trash || [];
  const lists = Object.entries(schema.collections || {});
  const shown = TEMPLATES.filter((t) => group === 'All' || t.group === group);
  const reusable = pages.flatMap((p) =>
    (p.sections || []).map((s) => ({ page: p, section: s, label: `${p.title}: ${s.heading?.title || KINDS[s.kind]?.label || s.kind}` }))
  );

  return (
    <Modal open onClose={() => setAddSection(null)} title="Add a section" size="lg">
      <div className="space-y-6">
        {trash.length > 0 && (
          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-slate-800">
              <ArchiveRestore size={15} className="text-[#0d7a6f]" /> Recently deleted from this tab
            </h3>
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {trash.map((t) => (
                <li key={t.deletedAt} className="flex items-center gap-3 px-3 py-2.5">
                  <Icon name={KINDS[t.section.kind]?.icon} size={16} className="shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium">{t.section.heading?.title || KINDS[t.section.kind]?.label || 'Section'}</span>
                    <span className="block text-[11.5px] text-slate-500">
                      {KINDS[t.section.kind]?.label} · deleted {ago(t.deletedAt)}
                    </span>
                  </span>
                  <button type="button" className="ui-btn ui-btn-accent !py-1" disabled={busy === t.deletedAt} onClick={() => restore(t)} data-tip="Restore|Put it back here, exactly as it was.">
                    Restore here
                  </button>
                  <button type="button" className="ui-icon-btn hover:!text-red-600" onClick={() => forget(t)} aria-label="Remove from this list" data-tip="Delete forever|Removes it from Recently deleted for good. Needs your password.">
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {lists.length > 0 && (
          <section>
            <h3 className="mb-1 text-[13px] font-semibold text-slate-800">Your lists</h3>
            <p className="mb-2 text-[12px] text-slate-500">Show one of your content lists here. Its entries are managed in Dashboard → Content and stay safe if the section is deleted.</p>
            <div className="flex flex-wrap gap-2">
              {lists.map(([key, def]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => start(createSection('collection', { heading: { title: def.label }, props: { collection: key, ...modeFor(key, def) } }))}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-medium transition hover:border-[#0d7a6f] hover:bg-[#f2faf9]"
                  data-tip={`${def.label}|Adds a “${def.label}” section; you can change its layout before saving.`}
                >
                  <Icon name={def.icon} size={15} className="text-[#0d7a6f]" fallback={null} />
                  {def.label}
                </button>
              ))}
            </div>
          </section>
        )}

        <section>
          <h3 className="mb-2 text-[13px] font-semibold text-slate-800">Templates</h3>
          <div className="mb-3 flex flex-wrap gap-1">
            {['All', ...TEMPLATE_GROUPS].map((g) => (
              <button key={g} type="button" className={cx('rounded-full px-3 py-1 text-[12.5px] font-semibold', group === g ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')} onClick={() => setGroup(g)}>
                {g}
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((t) => (
              <button key={t.id} type="button" onClick={() => start(t.make())} className="rounded-xl border border-slate-200 p-3 text-left transition hover:border-[#0d7a6f] hover:bg-[#f2faf9]">
                <span className="block text-[13.5px] font-semibold">{t.label}</span>
                <span className="mt-0.5 block text-[12px] leading-snug text-slate-500">{t.description}</span>
                <span className="mt-2 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10.5px] text-slate-500">{KINDS[t.kind].label}</span>
              </button>
            ))}
          </div>
        </section>

        {reusable.length > 0 && (
          <section className="border-t border-slate-200 pt-4">
            <label className="ui-label" htmlFor="reuse">
              Or copy a section from any tab
            </label>
            <select
              id="reuse"
              className="ui-input"
              value=""
              onChange={(e) => {
                const hit = reusable[Number(e.target.value)];
                if (!hit) return;
                const copy = clone(hit.section);
                copy.id = uid('s');
                start(normalizeSection(copy));
              }}
            >
              <option value="">Choose a section to copy…</option>
              {reusable.map((r, i) => (
                <option key={`${r.page.id}-${r.section.id}`} value={i}>
                  {r.label}
                </option>
              ))}
            </select>
          </section>
        )}
      </div>
    </Modal>
  );
}
