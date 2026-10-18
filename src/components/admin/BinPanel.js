'use client';
/**
 * Bin: everything that was deleted and can still come back - tabs, list
 * entries and sections. Restore is one click; "Delete forever" and "Empty the
 * Bin" need the editor's password (PasswordGate). The danger zone erases all
 * content from the database (typed ERASE + password).
 */
import { confirmDanger } from '@/components/ui/ConfirmDialog';
import Icon from '@/components/ui/Icon';
import { requirePassword } from '@/components/ui/PasswordGate';
import { forgetDeleted, restoreSection } from '@/lib/pageOps';
import { readItem } from '@/lib/roles';
import { KINDS } from '@/lib/sections';
import { eraseEverything, purgeItems, purgePages, restoreItems, restorePage, savePages, useBin, usePages, useSchema, useStatus } from '@/lib/store';
import { cx } from '@/lib/utils';
import { useAdmin } from '@/context/AdminContext';
import { ArchiveRestore, FileText, Loader2, Recycle, ShieldAlert, Trash2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

const when = (t) => (t ? new Date(t).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '');

function Row({ icon, title, sub, onRestore, onPurge, busy }) {
  // onPurge is null when this person may not delete permanently.
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-slate-900">{title}</span>
        <span className="block truncate text-[12px] text-slate-500">{sub}</span>
      </span>
      <div className="flex gap-1.5">
        <button type="button" className="ui-btn !py-1" onClick={onRestore} disabled={busy} data-tip="Restore|Put it back exactly as it was.">
          <ArchiveRestore size={14} /> Restore
        </button>
        {onPurge && <button
          type="button"
          className="ui-btn ui-btn-danger !py-1"
          onClick={onPurge}
          disabled={busy}
          data-tip="Delete forever|Removes it from the database for good. Needs your password."
        >
          <Trash2 size={14} /> <span className="hidden sm:inline">Delete forever</span>
        </button>}
      </div>
    </li>
  );
}

function Group({ title, count, children }) {
  if (!count) return null;
  return (
    <section className="ui-card overflow-hidden">
      <h3 className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-[13px] font-semibold text-slate-700">
        {title}
        <span className="text-[12px] font-medium text-slate-500">{count}</span>
      </h3>
      <ul className="divide-y divide-slate-100">{children}</ul>
    </section>
  );
}

export default function BinPanel() {
  const bin = useBin();
  const pages = usePages({ includeHidden: true });
  const schema = useSchema();
  const status = useStatus();
  const [busy, setBusy] = useState('');
  const live = status.mode === 'live';
  const { isSuper, can, canList } = useAdmin();
  const mayPurge = can('purge');

  const binPages = can('tabs') ? Object.values(bin.pages).sort((a, b) => b.deletedAt - a.deletedAt) : [];
  const binItems = Object.values(bin.items).filter((i) => canList(i.collection)).sort((a, b) => b.deletedAt - a.deletedAt);
  const binSections = can('sections') ? pages.flatMap((p) => (p.trash || []).map((t) => ({ page: p, entry: t }))) : [];
  const total = binPages.length + binItems.length + binSections.length;

  const run = async (key, fn, done) => {
    setBusy(key);
    try {
      await fn();
      if (done) toast.success(done);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy('');
    }
  };

  const purge = async (what, fn) => {
    const ok = await requirePassword({ title: 'Delete forever?', message: `Enter your password to permanently delete ${what}.` });
    if (ok) run('purge', fn, 'Deleted forever');
  };

  const emptyBin = async () => {
    const ok = await requirePassword({
      title: 'Empty the Bin?',
      message: `Enter your password to permanently delete all ${total} things in the Bin.`,
      confirmLabel: 'Empty the Bin',
    });
    if (!ok) return;
    run(
      'empty',
      async () => {
        if (binItems.length) await purgeItems(binItems.map((i) => i.id));
        if (binPages.length) await purgePages(binPages.map((p) => p.id));
        const withTrash = pages.filter((p) => (p.trash || []).length);
        if (withTrash.length) await savePages(withTrash.map((p) => ({ ...p, trash: [] })));
      },
      'The Bin is empty'
    );
  };

  const erase = async () => {
    const ok = await confirmDanger({
      title: live ? 'Erase everything from the database?' : 'Erase everything saved in this browser?',
      message: live
        ? 'All settings, tabs, sections, list entries, the Bin and every contact message are deleted from Firebase. The website will fall back to its built-in starting content.'
        : 'All edits, the Bin and messages saved in this browser are removed. The website will show its built-in starting content.',
      note: 'Download a backup first (Data and backups) unless you are certain.',
      phrase: 'ERASE',
      confirmLabel: 'Continue',
    });
    if (!ok) return;
    const sure = await requirePassword({ title: 'Last step: your password', message: 'Enter your password to erase everything.', confirmLabel: 'Erase everything' });
    if (!sure) return;
    run('erase', eraseEverything, 'Everything was erased');
  };

  return (
    <div className="space-y-5">
      <div className="ui-card flex flex-wrap items-center gap-3 p-4">
        <Recycle size={20} className="text-slate-500" />
        <p className="min-w-0 flex-1 text-[13px] text-slate-600">
          Deleted tabs, list entries and sections wait here until you restore them or delete them forever. Deleting forever needs your {live ? 'sign-in' : 'deletion'} password.
        </p>
        {mayPurge && <button type="button" className="ui-btn ui-btn-danger" disabled={!total || !!busy} onClick={emptyBin} data-tip="Empty the Bin|Permanently delete everything listed below. Needs your password.">
          {busy === 'empty' ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Empty the Bin
        </button>}
      </div>

      {!total && (
        <div className="ui-card grid place-items-center p-12 text-center text-slate-500">
          <Recycle size={28} />
          <p className="mt-2">The Bin is empty. Deleted tabs, entries and sections appear here.</p>
        </div>
      )}

      <Group title="Tabs" count={binPages.length}>
        {binPages.map((p) => (
          <Row
            key={p.id}
            icon={<FileText size={16} />}
            title={p.title || p.id}
            sub={`/${p.id === 'home' ? '' : p.id} · ${(p.sections || []).length} sections · deleted ${when(p.deletedAt)}`}
            busy={!!busy}
            onRestore={() => run(p.id, () => restorePage(p.id), 'Tab restored')}
            onPurge={mayPurge ? () => purge(`the tab “${p.title}” and its sections`, () => purgePages([p.id])) : null}
          />
        ))}
      </Group>

      <Group title="List entries" count={binItems.length}>
        {binItems.map((it) => {
          const def = schema.collections?.[it.collection];
          const r = def ? readItem(it, def) : { title: it.title || it.name || it.id };
          return (
            <Row
              key={it.id}
              icon={<Icon name={def?.icon} size={16} fallback={<FileText size={16} />} />}
              title={r.title || 'Untitled'}
              sub={`${def?.label || it.collection} · deleted ${when(it.deletedAt)}${def ? '' : ' · its list no longer exists'}`}
              busy={!!busy}
              onRestore={() => run(it.id, () => restoreItems([it.id]), 'Entry restored')}
              onPurge={mayPurge ? () => purge(`“${r.title || 'this entry'}”`, () => purgeItems([it.id])) : null}
            />
          );
        })}
      </Group>

      <Group title="Sections" count={binSections.length}>
        {binSections.map(({ page, entry }) => (
          <Row
            key={`${page.id}-${entry.deletedAt}`}
            icon={<Icon name={KINDS[entry.section.kind]?.icon} size={16} fallback={<FileText size={16} />} />}
            title={entry.section.heading?.title || KINDS[entry.section.kind]?.label || 'Section'}
            sub={`On “${page.title}” · ${KINDS[entry.section.kind]?.label || ''} · deleted ${when(entry.deletedAt)}`}
            busy={!!busy}
            onRestore={() => run('s', () => restoreSection(page, entry.deletedAt), `Section restored on “${page.title}”`)}
            onPurge={mayPurge ? () => purge('this section', () => forgetDeleted(page, entry.deletedAt)) : null}
          />
        ))}
      </Group>

      {isSuper && <section className={cx('rounded-xl border-2 border-red-200 bg-red-50/40 p-5')}>
        <h3 className="flex items-center gap-2 text-[14px] font-semibold text-red-800">
          <ShieldAlert size={17} /> Danger zone
        </h3>
        <p className="mt-1 text-[13px] text-red-900/80">
          {live
            ? 'Erase every document this website stored in Firebase: settings, tabs, list entries, the Bin and messages. Use it to start over or before closing the site.'
            : 'Erase everything this website saved in this browser.'}
        </p>
        <button type="button" className="ui-btn mt-3 !border-red-600 !bg-red-600 !text-white hover:!bg-red-700" disabled={!!busy} onClick={erase} data-tip="Erase everything|Needs the word ERASE and your password.">
          {busy === 'erase' ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Erase everything
        </button>
      </section>}
    </div>
  );
}
