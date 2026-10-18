'use client';
/** All tabs: order, menu visibility, hiding, settings and deletion. */
import { pageHref } from '@/components/ui/ActionButton';
import { useAdmin } from '@/context/AdminContext';
import { savePages, usePages } from '@/lib/store';
import { move } from '@/lib/utils';
import { ArrowDown, ArrowUp, ExternalLink, Eye, EyeOff, Plus, Settings2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function PagesManager() {
  const pages = usePages({ includeHidden: true });
  const { setPageSettings } = useAdmin();

  const reorder = async (i, dir) => {
    const next = move(pages, i, i + dir).map((p, idx) => ({ ...p, order: idx }));
    try {
      await savePages(next);
    } catch (err) {
      toast.error(err.message);
    }
  };
  const patch = async (page, change) => {
    try {
      await savePages([{ ...page, ...change }]);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-slate-600">Tabs appear in the menu in this order. Open a tab and turn on editing to change its sections.</p>
        <button type="button" className="ui-btn ui-btn-accent" onClick={() => setPageSettings('new')} data-tip="Add tab|Create a new page. You pick its name, address and starting layout.">
          <Plus size={14} /> Add tab
        </button>
      </div>
      <ul className="ui-card divide-y divide-slate-100">
        {pages.map((p, i) => (
          <li key={p.id} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
            <div className="flex flex-col">
              <button type="button" className="ui-icon-btn !h-6" disabled={i === 0} onClick={() => reorder(i, -1)} aria-label="Move up" data-tip="Move up|Earlier in the top menu.">
                <ArrowUp size={13} />
              </button>
              <button type="button" className="ui-icon-btn !h-6" disabled={i === pages.length - 1} onClick={() => reorder(i, 1)} aria-label="Move down" data-tip="Move down|Later in the top menu.">
                <ArrowDown size={13} />
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {p.title} {p.hidden && <span className="ml-1 rounded bg-amber-100 px-1.5 text-[11px] text-amber-800">hidden</span>}
              </p>
              <p className="text-[12px] text-slate-500">
                {pageHref(p.id)} · {(p.sections || []).length} section(s) · {p.inNav !== false ? 'in menu' : 'not in menu'}
              </p>
            </div>
            <label className="flex items-center gap-1.5 text-[12.5px] text-slate-600" data-tip="Show in the menu|Off: the tab still works by its address and in buttons, but is not listed in the top menu.">
              <input type="checkbox" checked={p.inNav !== false} onChange={(e) => patch(p, { inNav: e.target.checked })} /> Menu
            </label>
            {p.id !== 'home' && (
              <button type="button" className="ui-icon-btn" onClick={() => patch(p, { hidden: !p.hidden })} data-tip={p.hidden ? 'Hidden|Visitors cannot open this tab. Click to make it public.' : 'Public|Click to hide this whole tab from visitors.'} aria-label={p.hidden ? 'Show to visitors' : 'Hide from visitors'}>
                {p.hidden ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            )}
            <button type="button" className="ui-btn" onClick={() => setPageSettings(p.id)} data-tip="Settings|Name, address, menu icon, header and search-engine text.">
              <Settings2 size={14} /> Settings
            </button>
            <Link href={pageHref(p.id)} className="ui-btn" data-tip="Open|View this tab on the site. Use “Edit the site” to change its sections.">
              <ExternalLink size={14} /> Open
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
