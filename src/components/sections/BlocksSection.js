'use client';
/** Free layout: renders a list of blocks, with one level of columns. */
import ActionButton from '@/components/ui/ActionButton';
import Icon from '@/components/ui/Icon';
import Markdown from '@/components/ui/Markdown';
import SafeImage from '@/components/ui/SafeImage';
import Waveform from '@/components/ui/Waveform';
import { cx } from '@/lib/utils';

const ALIGN = { left: 'text-left', center: 'text-center', right: 'text-right' };
const JUSTIFY = { left: 'justify-start', center: 'justify-center', right: 'justify-end' };
const GAP = { sm: 'space-y-4', md: 'space-y-7', lg: 'space-y-12' };
const COL_GAP = { sm: 'gap-4', md: 'gap-8', lg: 'gap-12' };
const VALIGN = { top: 'items-start', center: 'items-center', bottom: 'items-end' };
const GRID = {
  '1:1': 'md:grid-cols-2',
  '2:1': 'md:grid-cols-[2fr_1fr]',
  '1:2': 'md:grid-cols-[1fr_2fr]',
  '1:1:1': 'md:grid-cols-3',
  '1:1:1:1': 'sm:grid-cols-2 lg:grid-cols-4',
};
const H_SIZES = { 1: 'text-[2.4rem] md:text-[3.4rem]', 2: 'text-[1.9rem] md:text-[2.4rem]', 3: 'text-[1.4rem] md:text-[1.7rem]', 4: 'text-[1.15rem]' };
const CARD = {
  outline: 'border border-line bg-card',
  filled: 'bg-bg2',
  shadow: 'bg-card shadow-[0_1px_2px_rgba(0,0,0,.04),0_10px_30px_-14px_rgba(0,0,0,.22)]',
  plain: '',
};
const CARD_COLS = { 1: 'grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' };

/** Turn a YouTube/Vimeo page link into an embeddable one. */
export function embedUrl(url) {
  const u = String(url || '').trim();
  let m = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{6,})/);
  if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}`;
  m = u.match(/vimeo\.com\/(\d+)/);
  if (m) return `https://player.vimeo.com/video/${m[1]}`;
  return u;
}

/** Remove script tags and inline event handlers from admin-written HTML. */
function cleanHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');
}

function Block({ block }) {
  const p = block.props || {};
  switch (block.type) {
    case 'heading': {
      const Tag = `h${Math.min(4, Math.max(1, Number(p.level) || 2))}`;
      return <Tag className={cx('font-heading font-medium leading-tight text-ink', H_SIZES[p.level] || H_SIZES[2], ALIGN[p.align])}>{p.text}</Tag>;
    }
    case 'text':
      return (
        <Markdown className={cx(ALIGN[p.align], p.size === 'lg' && 'text-[1.18rem]', p.size === 'sm' && 'text-[0.92rem]', p.align === 'center' && 'mx-auto max-w-[68ch]', p.align !== 'center' && 'max-w-[72ch]')}>
          {p.markdown}
        </Markdown>
      );
    case 'image':
      return (
        <figure className={cx('flex flex-col', p.align === 'center' && 'items-center', p.align === 'right' && 'items-end')}>
          <SafeImage
            src={p.src}
            alt={p.alt}
            fallbackText={p.alt}
            width={1400}
            className={cx('object-cover', `shape-${p.shape || 'rounded'}`)}
            style={{ width: `${Number(p.width) || 100}%`, aspectRatio: p.aspect && p.aspect !== 'auto' ? p.aspect : undefined, minHeight: p.src ? undefined : 160 }}
          />
          {p.caption && <figcaption className="mt-2 text-[0.85rem] text-muted">{p.caption}</figcaption>}
        </figure>
      );
    case 'buttons':
      return (
        <div className={cx('flex flex-wrap gap-3', JUSTIFY[p.align])}>
          {(p.items || []).map((b, i) => (
            <ActionButton key={i} {...b} />
          ))}
        </div>
      );
    case 'quote':
      return (
        <blockquote className={cx('mx-auto max-w-3xl', ALIGN[p.align])}>
          <p className="font-heading text-[1.6rem] leading-snug text-ink md:text-[2rem]">“{p.text}”</p>
          {p.cite && <footer className="mt-4 text-ink2">{p.cite}</footer>}
        </blockquote>
      );
    case 'list': {
      const items = String(p.items || '').split('\n').map((s) => s.trim()).filter(Boolean);
      return (
        <ul className={cx('grid gap-x-8 gap-y-3', CARD_COLS[p.columns] || 'grid-cols-1')}>
          {items.map((it, i) => (
            <li key={i} className="flex gap-3 text-ink2">
              <span className="mt-[3px] text-accent">
                <Icon name={p.icon || 'Check'} size={17} fallback={<span>•</span>} />
              </span>
              <Markdown inline>{it}</Markdown>
            </li>
          ))}
        </ul>
      );
    }
    case 'cards':
      return (
        <ul className={cx('grid grid-cols-1 gap-5', CARD_COLS[p.columns] || CARD_COLS[3])}>
          {(p.items || []).map((c, i) => {
            const inner = (
              <>
                {c.image && <SafeImage src={c.image} alt="" width={800} className="mb-4 aspect-[16/10] w-full rounded-[calc(var(--radius)*0.7)] object-cover" />}
                {c.icon && !c.image && (
                  <span className="mb-4 grid h-10 w-10 place-items-center rounded-full bg-accent-light text-accent">
                    <Icon name={c.icon} size={18} />
                  </span>
                )}
                <h3 className="font-heading text-[1.2rem] font-medium text-ink">{c.title}</h3>
                {c.text && <Markdown className="mt-2 text-[0.95rem]">{c.text}</Markdown>}
              </>
            );
            return (
              <li key={i} className={cx('rounded-card', CARD[p.style] || CARD.outline, p.style !== 'plain' && 'p-6')}>
                {c.action && c.target ? (
                  <ActionButton action={c.action} target={c.target} style="plain" className="block h-full hover:[&_h3]:text-accent">
                    {inner}
                  </ActionButton>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ul>
      );
    case 'embed': {
      const src = embedUrl(p.url);
      if (!src) return <div className="grid aspect-video place-items-center rounded-card border border-dashed border-line text-muted">Add a link to embed</div>;
      return (
        <div className="overflow-hidden rounded-card border border-line bg-bg2" style={{ aspectRatio: p.aspect || '16/9' }}>
          <iframe src={src} title={p.title || 'Embedded content'} className="h-full w-full" loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" />
        </div>
      );
    }
    case 'divider':
      if (p.style === 'wave') return <Waveform className="h-10 w-full" lines={3} height={40} subcarriers={40} />;
      if (p.style === 'dots') return <div className="text-center tracking-[1em] text-muted" aria-hidden="true">•••</div>;
      return <hr className="border-line" />;
    case 'spacer':
      return <div style={{ height: Number(p.height) || 40 }} aria-hidden="true" />;
    case 'html':
      return <div className="md" dangerouslySetInnerHTML={{ __html: cleanHtml(p.code) }} />;
    case 'columns':
      return (
        <div className={cx('grid grid-cols-1', GRID[p.layout] || GRID['1:1'], COL_GAP[p.gap] || COL_GAP.md, VALIGN[p.valign])}>
          {(block.children || []).map((col, i) => (
            <div key={i} className="min-w-0 space-y-6">
              {col.map((child) => (
                <Block key={child.id} block={child} />
              ))}
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
}

export default function BlocksSection({ section, editMode }) {
  const blocks = section.props.blocks || [];
  if (!blocks.length) {
    return editMode ? <p className="ui rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-500">Empty. Click Edit and add blocks.</p> : null;
  }
  return (
    <div className={GAP[section.props.gap] || GAP.md}>
      {blocks.map((b) => (
        <Block key={b.id} block={b} />
      ))}
    </div>
  );
}
