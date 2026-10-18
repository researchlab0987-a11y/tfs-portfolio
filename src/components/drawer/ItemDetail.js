'use client';
/** One content item, shown inside the side panel. */
import Markdown from '@/components/ui/Markdown';
import SafeImage from '@/components/ui/SafeImage';
import { useAdmin } from '@/context/AdminContext';
import { useDrawer } from '@/context/DrawerContext';
import { bibtex, citationText, readItem } from '@/lib/roles';
import { useCollectionDef, useConfig, useItemsMap } from '@/lib/store';
import { ChevronLeft, ChevronRight, Copy, ExternalLink, Pencil } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

function CopyButton({ text, label }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch {
      toast.error('Copying is blocked in this browser. Select the text instead.');
    }
  };
  return (
    <button type="button" onClick={copy} className="btn btn-outline !px-3 !py-1.5 text-[0.85rem]">
      <Copy size={14} /> {done ? 'Copied' : label}
    </button>
  );
}

export default function ItemDetail({ id, ids }) {
  const items = useItemsMap();
  const config = useConfig();
  const item = items[id];
  const def = useCollectionDef(item?.collection);
  const drawer = useDrawer();
  const { canList, openItemEditor } = useAdmin();
  const [showBib, setShowBib] = useState(false);

  if (!item || !def) {
    return (
      <div className="px-6 py-20 text-center md:px-10">
        <h2 className="font-heading text-3xl text-ink">This entry is no longer available</h2>
        <p className="mt-2 text-ink2">It may have been removed or hidden.</p>
      </div>
    );
  }

  const r = readItem(item, def);
  const pos = ids ? ids.indexOf(id) : -1;
  const prev = pos > 0 ? ids[pos - 1] : null;
  const next = pos >= 0 && pos < ids.length - 1 ? ids[pos + 1] : null;
  const go = (target) => drawer.replace({ type: 'item', id: target, ids });
  const highlight = config.person?.citeAs;

  return (
    <article className="mx-auto max-w-[860px] px-5 pb-16 pt-8 md:px-10 md:pt-12">
      <p className="mb-3 text-[0.9rem] text-accent">{[def.singular, r.group, r.date].filter(Boolean).join(', ')}</p>
      <h1 className="font-heading text-[2rem] font-medium leading-[1.12] text-ink md:text-[2.6rem]">{r.title}</h1>
      {r.subtitle && <p className="mt-3 text-[1.15rem] text-ink2">{r.subtitle}</p>}
      {r.metas.length > 0 && (
        <ul className="mt-3 space-y-1 text-ink2">
          {r.metas.map((m) => (
            <li key={m.key}>
              {highlight && m.value.includes(highlight) ? (
                m.value.split(highlight).map((part, i, arr) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && <strong className="font-semibold text-ink">{highlight}</strong>}
                  </span>
                ))
              ) : (
                m.value
              )}
            </li>
          ))}
        </ul>
      )}
      {r.badge && <span className="mt-4 inline-block rounded-md bg-accent-light px-2 py-0.5 text-[0.8rem] font-semibold text-accent">{r.badge}</span>}

      {(r.links.length > 0 || canList(item.collection)) && (
        <div className="mt-6 flex flex-wrap gap-2">
          {r.links.map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="btn btn-solid !py-2 text-[0.9rem]">
              <ExternalLink size={15} /> {l.label}
            </a>
          ))}
          {canList(item.collection) && (
            <button type="button" onClick={() => openItemEditor(item.collection, item)} className="btn btn-outline !py-2 text-[0.9rem]">
              <Pencil size={15} /> Edit
            </button>
          )}
        </div>
      )}

      {r.images.length > 0 && (
        <div className="mt-8 space-y-3">
          <SafeImage src={r.images[0]} alt={r.title} width={1600} className="max-h-[70vh] w-full rounded-card bg-bg2 object-contain" />
          {r.images.length > 1 && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {r.images.slice(1).map((src) => (
                <a key={src} href={src} target="_blank" rel="noopener noreferrer">
                  <SafeImage src={src} alt="" width={500} className="aspect-square w-full rounded-[calc(var(--radius)*0.6)] object-cover" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {r.body && <Markdown className="mt-8 text-[1.05rem]">{r.body}</Markdown>}

      {r.tags.length > 0 && (
        <ul className="mt-8 flex flex-wrap gap-1.5">
          {r.tags.map((t) => (
            <li key={t} className="rounded-full border border-line px-3 py-1 text-[0.85rem] text-ink2">
              {t}
            </li>
          ))}
        </ul>
      )}

      {r.details.length > 0 && (
        <dl className="mt-8 grid gap-x-6 gap-y-2 border-t border-line pt-6 sm:grid-cols-[9rem_1fr]">
          {r.details.map((d) => (
            <div key={d.key} className="contents">
              <dt className="text-[0.88rem] text-muted">{d.label}</dt>
              <dd className="break-words text-ink">
                {d.key === 'doi' ? (
                  <a href={`https://doi.org/${d.value}`} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-4">
                    {d.value}
                  </a>
                ) : (
                  d.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {def.citation && (
        <section className="mt-10 rounded-card border border-line bg-bg2 p-5">
          <h2 className="mb-3 font-heading text-[1.15rem] font-medium text-ink">Cite</h2>
          <p className="text-[0.95rem] leading-relaxed text-ink2">{citationText(item)}</p>
          {showBib && <pre className="mt-4 overflow-x-auto rounded-lg bg-card p-4 text-[0.8rem] text-ink">{bibtex(item)}</pre>}
          <div className="mt-4 flex flex-wrap gap-2">
            <CopyButton text={citationText(item)} label="Copy citation" />
            <CopyButton text={bibtex(item)} label="Copy BibTeX" />
            <button type="button" onClick={() => setShowBib((v) => !v)} className="btn-link text-[0.85rem]">
              {showBib ? 'Hide BibTeX' : 'Show BibTeX'}
            </button>
          </div>
        </section>
      )}

      {(prev || next) && (
        <nav className="mt-12 grid grid-cols-2 gap-3 border-t border-line pt-6" aria-label="Previous and next">
          <div>
            {prev && (
              <button type="button" onClick={() => go(prev)} className="group flex w-full flex-col items-start text-left">
                <span className="inline-flex items-center gap-1 text-[0.85rem] text-muted"><ChevronLeft size={15} /> Previous</span>
                <span className="mt-1 line-clamp-2 text-ink group-hover:text-accent">{readItem(items[prev] || {}, def).title}</span>
              </button>
            )}
          </div>
          <div>
            {next && (
              <button type="button" onClick={() => go(next)} className="group flex w-full flex-col items-end text-right">
                <span className="inline-flex items-center gap-1 text-[0.85rem] text-muted">Next <ChevronRight size={15} /></span>
                <span className="mt-1 line-clamp-2 text-ink group-hover:text-accent">{readItem(items[next] || {}, def).title}</span>
              </button>
            )}
          </div>
        </nav>
      )}
    </article>
  );
}
