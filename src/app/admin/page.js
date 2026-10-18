'use client';
/**
 * Dashboard. The section lives in the address (?tab=…, and ?list=… for a
 * content list), so the browser back button and shared links work.
 */
import AdminOverview from '@/components/admin/AdminOverview';
import AdminShell, { SECTIONS } from '@/components/admin/AdminShell';
import BinPanel from '@/components/admin/BinPanel';
import AccessPanel from '@/components/admin/AccessPanel';
import { sectionAllowed } from '@/lib/access';
import ContentManager from '@/components/admin/ContentManager';
import DataPanel from '@/components/admin/DataPanel';
import DesignPanel from '@/components/admin/DesignPanel';
import MessagesPanel from '@/components/admin/MessagesPanel';
import PagesManager from '@/components/admin/PagesManager';
import { useAdmin } from '@/context/AdminContext';
import { useItemsMap, useSchema, watchMessages } from '@/lib/store';
import { cx } from '@/lib/utils';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';

function useUnread(enabled) {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!enabled) return undefined;
    return watchMessages(
      (list) => setUnread(list.filter((m) => !m.read).length),
      () => setUnread(0)
    );
  }, [enabled]);
  return unread;
}

/** The content lists, shown under "Content" in the sidebar. */
function ListNav({ active, onPick }) {
  const schema = useSchema();
  const { canList } = useAdmin();
  const items = useItemsMap();
  const counts = useMemo(() => {
    const c = {};
    Object.values(items).forEach((i) => (c[i.collection] = (c[i.collection] || 0) + 1));
    return c;
  }, [items]);
  return (
    <ul className="space-y-0.5 py-0.5">
      {Object.entries(schema.collections || {}).filter(([k]) => canList(k)).map(([k, def]) => (
        <li key={k}>
          <button
            type="button"
            onClick={() => onPick(k)}
            aria-current={k === active ? 'true' : undefined}
            className={cx(
              'flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px]',
              k === active ? 'bg-white/10 font-semibold text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
            )}
          >
            <span className="truncate">{def.label}</span>
            <span className="text-[11px] text-slate-500">{counts[k] || 0}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Dashboard() {
  const admin = useAdmin();
  const { isAdmin, authReady } = admin;
  const router = useRouter();
  const params = useSearchParams();
  const schema = useSchema();
  const asked = params.get('tab');
  const tab = SECTIONS.some((s) => s.id === asked) && sectionAllowed(asked, admin) ? asked : 'overview';
  const firstList = Object.keys(schema.collections || {}).find((k) => admin.canList(k)) || Object.keys(schema.collections || {})[0];
  const list = schema.collections?.[params.get('list')] ? params.get('list') : firstList;
  const unread = useUnread(authReady && isAdmin && admin.can('messages'));

  useEffect(() => {
    const label = SECTIONS.find((s) => s.id === tab)?.label || 'Dashboard';
    document.title = `${label} · Dashboard`;
  }, [tab]);

  useEffect(() => {
    if (authReady && !isAdmin) router.replace('/login');
  }, [authReady, isAdmin, router]);

  const go = (id, listKey) => {
    const q = new URLSearchParams({ tab: id });
    if (id === 'content' && (listKey || list)) q.set('list', listKey || list);
    router.push(`/admin?${q.toString()}`, { scroll: false });
    window.scrollTo({ top: 0 });
  };

  if (!authReady || !isAdmin) return <div className="min-h-[60vh]" aria-busy="true" />;

  return (
    <AdminShell active={tab} onGo={go} unread={unread} subnav={tab === 'content' ? <ListNav active={list} onPick={(k) => go('content', k)} /> : null}>
      {tab === 'overview' && <AdminOverview onGo={go} unread={unread} />}
      {tab === 'tabs' && <PagesManager />}
      {tab === 'content' && <ContentManager active={list} onSelect={(k) => go('content', k)} />}
      {tab === 'design' && <DesignPanel />}
      {tab === 'messages' && <MessagesPanel />}
      {tab === 'data' && <DataPanel />}
      {tab === 'bin' && <BinPanel />}
      {tab === 'access' && <AccessPanel />}
    </AdminShell>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={null}>
      <Dashboard />
    </Suspense>
  );
}
