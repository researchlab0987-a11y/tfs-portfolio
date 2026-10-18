'use client';
/**
 * Dashboard start page: counts at a glance, shortcuts to common jobs and a
 * getting-started checklist that ticks itself off from the real content.
 */
import { useAdmin } from '@/context/AdminContext';
import { uploadsEnabled } from '@/lib/cloudinary';
import { exportData, useConfig, useItemsMap, usePages, useSchema, useStatus } from '@/lib/store';
import { cx, safeLocalStorage } from '@/lib/utils';
import { ArrowRight, CheckCircle2, Circle, Download, FilePlus2, FolderOpen, Inbox, LayoutPanelTop, Palette, Pencil, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

const BACKUP_KEY = 'tfs:admin:last-backup';

function Stat({ label, value, note, onClick, tip }) {
  return (
    <button type="button" onClick={onClick} data-tip={tip} className="ui-card group p-4 text-left transition hover:border-slate-300 hover:shadow-md">
      <p className="text-[12px] font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-[26px] font-semibold leading-none text-slate-900">{value}</p>
      {note && <p className="mt-1.5 text-[12px] text-slate-500">{note}</p>}
    </button>
  );
}

function Action({ Icon, title, text, onClick, tip, accent }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-tip={tip}
      className={cx(
        'group flex items-start gap-3 rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md',
        accent ? 'border-emerald-200 bg-emerald-50 hover:border-emerald-300' : 'border-slate-200 bg-white hover:border-slate-300'
      )}
    >
      <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-lg', accent ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-700')}>
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 font-semibold text-slate-900">
          {title} <ArrowRight size={14} className="opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
        </span>
        <span className="mt-0.5 block text-[12.5px] text-slate-500">{text}</span>
      </span>
    </button>
  );
}

export default function AdminOverview({ onGo, unread = 0 }) {
  const { setEditMode, setPageSettings, openItemEditor, isSuper, can, canList, canAnyList } = useAdmin();
  const router = useRouter();
  const pages = usePages({ includeHidden: true });
  const schema = useSchema();
  const items = useItemsMap();
  const config = useConfig();
  const status = useStatus();
  const [lastBackup, setLastBackup] = useState(() => {
    try {
      return Number(safeLocalStorage()?.getItem(BACKUP_KEY)) || 0;
    } catch {
      return 0;
    }
  });

  const collections = schema.collections || {};
  const counts = useMemo(() => {
    const c = {};
    Object.values(items).forEach((i) => (c[i.collection] = (c[i.collection] || 0) + 1));
    return c;
  }, [items]);
  const totalItems = Object.values(counts).reduce((a, b) => a + b, 0);
  const hiddenTabs = pages.filter((p) => p.hidden).length;
  const pubKey = collections.publications ? 'publications' : Object.keys(collections)[0];

  const backup = () => {
    const blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `site-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    const now = Date.now();
    setLastBackup(now);
    try {
      safeLocalStorage()?.setItem(BACKUP_KEY, String(now));
    } catch {
      // Not remembered.
    }
  };

  const editSite = () => {
    setEditMode(true);
    router.push('/');
  };

  const fullChecklist = [
    {
      done: Boolean(config.person?.name && config.site?.title),
      title: 'Check the name and site title',
      text: 'Design → Site details. Shown in the browser tab and search results.',
      go: () => onGo('design'),
    },
    {
      done: Boolean(config.person?.photo),
      title: 'Add a profile photo',
      text: 'Design → Site details → Default photo. Drag a photo in, then crop it.',
      go: () => onGo('design'),
    },
    {
      done: Boolean(config.contact?.email || (config.socials || []).length),
      title: 'Add contact details and profile links',
      text: 'Design → Contact information and Profile links.',
      go: () => onGo('design'),
    },
    {
      done: (counts[pubKey] || 0) > 0,
      title: `Add your ${collections[pubKey]?.label?.toLowerCase() || 'content'}`,
      text: 'Content → pick a list → Add. Every section showing that list updates by itself.',
      go: () => onGo('content', pubKey),
    },
    {
      done: status.mode === 'live' && status.connected,
      title: 'Save changes online',
      text: status.mode === 'live' ? 'Connected to the online database.' : 'Right now changes stay in this browser. See Data and backups.',
      go: () => onGo('data'),
    },
    {
      done: uploadsEnabled,
      title: 'Optional: connect an image host',
      text: 'Without one, photos are stored compressed inside the site data (each kept small).',
      go: () => onGo('data'),
    },
    {
      done: Date.now() - lastBackup < 30 * 86400000,
      title: 'Download a backup',
      text: lastBackup ? `Last backup ${new Date(lastBackup).toLocaleDateString()}. Do one monthly and before big changes.` : 'One file with everything. Keep it somewhere safe.',
      go: backup,
    },
  ];
  // Admins only see the steps they are allowed to do.
  const needs = [can('design'), can('design'), can('design'), canList(pubKey), isSuper, isSuper, can('backup')];
  const checklist = fullChecklist.filter((_, i) => needs[i]);
  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <div className="space-y-6">
      <section aria-label="At a glance" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Tabs" value={pages.length} note={hiddenTabs ? `${hiddenTabs} hidden from visitors` : 'All visible'} onClick={() => onGo('tabs')} tip="Tabs|Open the list of pages in the menu." />
        <Stat label="Content entries" value={totalItems} note={`in ${Object.keys(collections).length} lists`} onClick={() => onGo('content')} tip="Content|Open publications, experience, awards and the other lists." />
        {can('messages') && <Stat label="Unread messages" value={unread} note={unread ? 'Waiting for a reply' : 'All caught up'} onClick={() => onGo('messages')} tip="Messages|Open the contact-form inbox." />}
        <Stat
          label="Saving"
          value={status.mode === 'live' ? (status.connected ? 'Online' : 'Offline') : 'Local'}
          note={status.mode === 'live' ? 'Changes are shared with visitors' : 'Changes stay in this browser'}
          onClick={() => onGo('data')}
          tip="Where changes go|Open Data and backups for details."
        />
      </section>

      <section>
        <h2 className="mb-2.5 text-[14px] font-semibold text-slate-800">Quick actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Action accent Icon={Pencil} title="Edit the site" text="Open the website with editing on and change any section in place." onClick={editSite} tip="Edit the site|Hover a section on the site to see its edit toolbar." />
          {pubKey && canList(pubKey) && (
            <Action
              Icon={Plus}
              title={`Add ${collections[pubKey]?.singular?.toLowerCase() || 'an entry'}`}
              text={`Create a new entry in ${collections[pubKey]?.label || 'a list'}.`}
              onClick={() => (onGo('content', pubKey), openItemEditor(pubKey))}
              tip="Add an entry|Opens an empty form. Fill it in and press Add."
            />
          )}
          {can('tabs') && <Action Icon={FilePlus2} title="Add a tab" text="Create a new page in the menu, blank or from a template." onClick={() => setPageSettings('new')} tip="Add a tab|You choose its name, address and starting layout." />}
          {canAnyList() && <Action Icon={FolderOpen} title="Manage content" text="Edit, hide, reorder or duplicate entries in any list." onClick={() => onGo('content')} />}
          {can('design') && <Action Icon={Palette} title="Change the look" text="Theme, colours, fonts, menu and motion for the whole site." onClick={() => onGo('design')} />}
          {can('backup') && <Action Icon={Download} title="Download a backup" text="Save everything to one file on this computer." onClick={backup} tip="Download a backup|A .json file you can restore from Data and backups." />}
        </div>
      </section>

      {checklist.length > 0 && <section className="ui-card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[14px] font-semibold text-slate-800">Getting started</h2>
          <span className="text-[12px] font-medium text-slate-500">
            {doneCount} of {checklist.length} done
          </span>
        </div>
        <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={doneCount} aria-valuemin={0} aria-valuemax={checklist.length}>
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(doneCount / checklist.length) * 100}%` }} />
        </div>
        <ul className="divide-y divide-slate-100">
          {checklist.map((c) => (
            <li key={c.title}>
              <button type="button" onClick={c.go} className="flex w-full items-start gap-3 rounded-lg px-1 py-2.5 text-left hover:bg-slate-50">
                {c.done ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-500" /> : <Circle size={18} className="mt-0.5 shrink-0 text-slate-300" />}
                <span className="min-w-0 flex-1">
                  <span className={cx('block font-medium', c.done ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-900')}>{c.title}</span>
                  <span className="block text-[12.5px] text-slate-500">{c.text}</span>
                </span>
                <ArrowRight size={15} className="mt-1 shrink-0 text-slate-300" />
              </button>
            </li>
          ))}
        </ul>
      </section>}

      <section className="grid gap-3 md:grid-cols-2">
        <div className="ui-card p-5">
          <h2 className="mb-2 flex items-center gap-2 text-[14px] font-semibold text-slate-800">
            <LayoutPanelTop size={16} /> Two ways to edit
          </h2>
          <ul className="space-y-1.5 text-[13px] text-slate-600">
            <li>
              <b className="text-slate-800">On the page</b> (Edit the site): change text, images and section layout exactly where visitors see them.
            </li>
            <li>
              <b className="text-slate-800">Here in the dashboard</b>: manage lists, tabs, the overall design and backups.
            </li>
          </ul>
        </div>
        <div className="ui-card p-5">
          <h2 className="mb-2 flex items-center gap-2 text-[14px] font-semibold text-slate-800">
            <Inbox size={16} /> Tip
          </h2>
          <p className="text-[13px] text-slate-600">
            Not sure what a button does? Hover over it (or tab to it with the keyboard) for a short explanation. Each section also has a <b>How this works</b> guide at the top.
          </p>
        </div>
      </section>
    </div>
  );
}
