'use client';
/**
 * Renders one tab: its header band and its sections, in order.
 * Used for full pages and, with `inDrawer`, inside the side panel.
 */
import { useAdmin } from '@/context/AdminContext';
import { normalizePage, normalizeSection } from '@/lib/sections';
import { useConfig, usePage, useStatus } from '@/lib/store';
import { cx } from '@/lib/utils';
import { Plus, Settings2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo } from 'react';
import SectionFrame, { backgroundStyle } from './SectionFrame';

function InsertPoint({ pageId, index, prominent = false }) {
  const { setAddSection } = useAdmin();
  return (
    <div className={cx('ui group/ins relative z-20 flex items-center justify-center', prominent ? 'py-10' : 'h-0')}>
      <button
        type="button"
        onClick={() => setAddSection({ pageId, index })}
        className={cx(
          'inline-flex items-center gap-1.5 rounded-full border border-dashed border-[#0d7a6f] bg-white px-3 py-1 text-xs font-semibold text-[#0d7a6f] shadow-sm transition hover:bg-[#ddf1ee]',
          !prominent && 'absolute -translate-y-1/2 opacity-60 hover:opacity-100 focus:opacity-100'
        )}
      >
        <Plus size={14} /> Add section here
      </button>
    </div>
  );
}

const HEADER_PAD = {
  compact: 'pb-5 pt-5 sm:pb-7 sm:pt-8 md:pb-9 md:pt-12',
  normal: 'pb-6 pt-6 sm:pb-10 sm:pt-12 md:pb-16 md:pt-20',
  tall: 'pb-10 pt-12 sm:pb-16 sm:pt-20 md:pb-24 md:pt-32',
};

/** Inline background for the whole tab. */
function pageBackground(bg) {
  if (!bg || bg.type === 'none') return null;
  const out = {};
  if (bg.type === 'gradient' && bg.color) out.background = `linear-gradient(${bg.angle ?? 160}deg, ${bg.color}, ${bg.color2 || bg.color})`;
  else if (bg.type === 'image' && bg.image) {
    const fade = Number(bg.overlay) || 0;
    out.backgroundImage = `linear-gradient(color-mix(in srgb, var(--bg-primary) ${Math.round(fade * 100)}%, transparent), color-mix(in srgb, var(--bg-primary) ${Math.round(fade * 100)}%, transparent)), url("${String(bg.image).replace(/"/g, '')}")`;
    out.backgroundSize = 'cover';
    out.backgroundPosition = 'center';
    if (bg.fixed) out.backgroundAttachment = 'fixed';
  } else if (bg.color) out.background = bg.color;
  if (bg.textColor) {
    out['--text-primary'] = bg.textColor;
    out['--text-secondary'] = `color-mix(in srgb, ${bg.textColor} 82%, transparent)`;
    out['--text-muted'] = `color-mix(in srgb, ${bg.textColor} 60%, transparent)`;
    out.color = bg.textColor;
  }
  return out;
}

function PageHeader({ page, inDrawer, hasPageBg }) {
  const h = page.header;
  if (!h.show) return null;
  const title = h.title || page.title;
  const custom = h.tone === 'custom';
  const toneClass = custom ? '' : h.tone && h.tone !== 'inherit' ? `tone-${h.tone}` : hasPageBg ? '' : 'bg-bg';
  const style = custom ? backgroundStyle({ ...h, tone: 'custom' }) : undefined;
  return (
    <div className={cx('relative isolate border-b border-line', toneClass)} style={style}>
      {custom && h.bgType === 'image' && h.bgImage && <div className="absolute inset-0 -z-10 bg-black" style={{ opacity: Number(h.overlay) || 0 }} aria-hidden="true" />}
      {/* Compact on phones: the top bar already names the tab. */}
      <div className={cx('mx-auto max-w-site', inDrawer ? 'px-5 pb-5 pt-5 md:px-10 md:pb-8 md:pt-10' : 'px-5 md:px-8', inDrawer ? '' : HEADER_PAD[h.size] || HEADER_PAD.normal, h.align === 'center' && 'text-center')}>
        <h1 className="font-heading text-[1.75rem] font-medium leading-[1.08] text-ink sm:text-[2.3rem] md:text-[3.4rem]">{title}</h1>
        {h.subtitle && <p className={cx('mt-2 line-clamp-3 max-w-2xl text-[0.98rem] text-ink2 sm:mt-4 sm:line-clamp-none sm:text-[1.08rem]', h.align === 'center' && 'mx-auto')}>{h.subtitle}</p>}
      </div>
    </div>
  );
}

export function NotFound({ inDrawer }) {
  return (
    <div className={cx('mx-auto max-w-xl px-6 text-center', inDrawer ? 'py-16' : 'py-32')}>
      <h1 className="font-heading text-4xl text-ink">This tab does not exist</h1>
      <p className="mt-3 text-ink2">It may have been renamed or removed.</p>
      {!inDrawer && (
        <Link href="/" className="btn btn-solid mt-8">
          Go to the home page
        </Link>
      )}
    </div>
  );
}

export default function PageView({ slug, inDrawer = false }) {
  const rawPage = usePage(slug);
  const config = useConfig();
  const status = useStatus();
  const { editMode, sectionEdit, setPageSettings, can } = useAdmin();
  const page = useMemo(() => normalizePage(rawPage), [rawPage]);
  const canEdit = editMode && !inDrawer;
  const canSections = canEdit && can('sections');
  const canTabs = canEdit && can('tabs');

  useEffect(() => {
    if (inDrawer || !page) return;
    const site = config.site?.title || '';
    document.title = page.seo?.title || (slug === 'home' ? site : `${page.title} | ${site}`);
  }, [page, slug, config.site?.title, inDrawer]);

  const sections = useMemo(() => {
    if (!page) return [];
    let list = page.sections.map(normalizeSection).filter(Boolean);
    if (sectionEdit && sectionEdit.pageId === page.id && !inDrawer) {
      const draft = { ...sectionEdit.draft, __draft: true };
      if (sectionEdit.isNew) {
        list = [...list];
        list.splice(Math.min(sectionEdit.index ?? list.length, list.length), 0, draft);
      } else {
        list = list.map((s) => (s.id === draft.id ? draft : s));
      }
    }
    return list;
  }, [page, sectionEdit, inDrawer]);

  if (!page) {
    // While the store is still on its first layer, an unknown slug may just
    // not have arrived yet; avoid flashing "not found" before the database answers.
    if (status.source === 'seed' && status.mode === 'live' && !status.error && !status.slow) {
      return <div className="min-h-[60vh]" aria-busy="true" />;
    }
    return <NotFound inDrawer={inDrawer} />;
  }
  if (page.hidden && !editMode) return <NotFound inDrawer={inDrawer} />;

  const visible = sections.filter((s) => canEdit || !s.hidden);

  return (
    <div className={cx(page.hidden && canEdit && 'opacity-90')} style={pageBackground(page.background) || undefined}>
      {canTabs && (
        <div className="ui pointer-events-none sticky top-[var(--nav-h)] z-30 flex justify-center">
          <button type="button" onClick={() => setPageSettings(page.id)} className="pointer-events-auto mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-900/90 px-3 py-1 text-xs font-semibold text-white shadow">
            <Settings2 size={13} /> Tab settings: {page.title}
            {page.hidden && <span className="ml-1 rounded bg-amber-400 px-1.5 text-[10px] text-black">hidden</span>}
          </button>
        </div>
      )}
      <PageHeader page={page} inDrawer={inDrawer} hasPageBg={Boolean(pageBackground(page.background))} />
      {visible.map((section, i) => (
        <div key={section.id} className="relative">
          {canSections && <InsertPoint pageId={page.id} index={i} />}
          <SectionFrame
            section={section}
            page={rawPage}
            index={i}
            total={visible.length}
            inDrawer={inDrawer}
            editMode={canEdit}
            isDraft={Boolean(section.__draft && sectionEdit?.isNew)}
            isEditing={Boolean(section.__draft)}
          />
        </div>
      ))}
      {canSections && <InsertPoint pageId={page.id} index={page.sections.length} prominent />}
      {!visible.length && !canEdit && (
        <div className="mx-auto max-w-site px-6 py-24 text-center text-ink2">Nothing has been added to this tab yet.</div>
      )}
    </div>
  );
}
