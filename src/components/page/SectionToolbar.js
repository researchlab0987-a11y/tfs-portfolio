'use client';
import { useAdmin } from '@/context/AdminContext';
import { duplicateSection, moveSection, removeSection, restoreSection, toggleSectionHidden } from '@/lib/pageOps';
import { confirmDanger, undoToast } from '@/components/ui/ConfirmDialog';
import { getState } from '@/lib/store';
import { KINDS, normalizeSection } from '@/lib/sections';
import { clone } from '@/lib/utils';
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, Settings2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SectionToolbar({ section, page, index, total, isDraft }) {
  const { setSectionEdit, sectionEdit } = useAdmin();
  const editingThis = sectionEdit?.sectionId === section.id;

  const run = async (fn, done) => {
    try {
      const r = await fn();
      if (done) toast.success(done);
      if (r?.queued) toast('Saved on this device. It will sync when the connection returns.');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const raw = page.sections.find((s) => s.id === section.id) || section;

  if (isDraft) {
    return (
      <div className="ui pointer-events-none absolute left-3 top-3 z-30 rounded-md bg-[#0d7a6f] px-2.5 py-1 text-xs font-semibold text-white">
        New section — not saved yet
      </div>
    );
  }

  return (
    <div
      className={`ui absolute right-3 top-3 z-30 flex items-center gap-0.5 rounded-xl border border-slate-200 bg-white/95 p-1 shadow-lg backdrop-blur transition-opacity ${
        editingThis ? 'opacity-100' : 'opacity-100 md:opacity-0 md:group-hover/sec:opacity-100 md:focus-within:opacity-100'
      }`}
    >
      <span className="px-2 text-[11px] font-semibold text-slate-500">{KINDS[section.kind]?.label}</span>
      <button
        type="button"
        className="ui-btn ui-btn-accent !px-2.5 !py-1 text-xs"
        onClick={() => setSectionEdit({ pageId: page.id, sectionId: section.id, draft: normalizeSection(clone(raw)), isNew: false })}
      >
        <Settings2 size={14} /> Edit
      </button>
      <button type="button" className="ui-icon-btn" disabled={index === 0} onClick={() => run(() => moveSection(page, section.id, -1))} aria-label="Move up" title="Move up">
        <ArrowUp size={15} />
      </button>
      <button type="button" className="ui-icon-btn" disabled={index >= total - 1} onClick={() => run(() => moveSection(page, section.id, 1))} aria-label="Move down" title="Move down">
        <ArrowDown size={15} />
      </button>
      <button type="button" className="ui-icon-btn" onClick={() => run(() => duplicateSection(page, section.id), 'Section duplicated')} aria-label="Duplicate" title="Duplicate">
        <Copy size={15} />
      </button>
      <button type="button" className="ui-icon-btn" onClick={() => run(() => toggleSectionHidden(page, section.id), section.hidden ? 'Section visible' : 'Section hidden')} aria-label={section.hidden ? 'Show to visitors' : 'Hide from visitors'} title={section.hidden ? 'Show to visitors' : 'Hide from visitors'}>
        {section.hidden ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
      <button
        type="button"
        className="ui-icon-btn hover:!text-red-600"
        onClick={async () => {
          const name = section.heading?.title || KINDS[section.kind]?.label || 'this section';
          const ok = await confirmDanger({
            title: 'Delete this section?',
            message: `“${name}” will be removed from this tab.`,
            note: 'The list entries it shows (publications, collaborators…) are not deleted. You can bring the section back from “Add section → Recently deleted”.',
            phrase: 'delete',
            confirmLabel: 'Delete section',
          });
          if (!ok) return;
          try {
            await removeSection(page, section.id);
            undoToast('Section deleted', () => {
              const fresh = getState().pages[page.id];
              const entry = fresh?.trash?.[0];
              return restoreSection(fresh, entry?.deletedAt);
            });
          } catch (err) {
            toast.error(err.message);
          }
        }}
        aria-label="Delete"
        data-tip="Delete|Removes the section from this tab. It stays in Recently deleted, and its list entries are kept."
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
