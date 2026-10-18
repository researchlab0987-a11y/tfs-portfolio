'use client';
/** Formatted text with an optional image and a short list of key facts. */
import Markdown from '@/components/ui/Markdown';
import SafeImage from '@/components/ui/SafeImage';
import { cx } from '@/lib/utils';

function Facts({ title, facts }) {
  if (!facts?.length) return null;
  return (
    <aside className="rounded-card border border-line bg-card p-6">
      {title && <h3 className="mb-4 font-heading text-[1.15rem] font-medium text-ink">{title}</h3>}
      <dl className="space-y-3.5">
        {facts.map((f, i) => (
          <div key={`${f.label}-${i}`}>
            <dt className="text-[0.82rem] text-muted">{f.label}</dt>
            <dd className="text-[0.98rem] text-ink">
              <Markdown inline>{f.value}</Markdown>
            </dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

function Figure({ p }) {
  if (!p.image && p.imageSide === 'none') return null;
  return (
    <figure>
      <SafeImage
        src={p.image}
        alt={p.imageAlt}
        fallbackText={p.imageAlt}
        width={1000}
        className={cx('w-full object-cover', `shape-${p.imageShape}`, p.imageSide === 'top' ? 'aspect-[21/9]' : 'aspect-[4/5]', p.imageShape === 'circle' && '!aspect-square')}
      />
      {p.imageCaption && <figcaption className="mt-2 text-[0.85rem] text-muted">{p.imageCaption}</figcaption>}
    </figure>
  );
}

export default function RichTextSection({ section }) {
  const p = section.props;
  const text = (
    <Markdown className={cx('max-w-[70ch] text-[1.04rem]', p.lead && 'md-lead', Number(p.columns) === 2 && 'md-cols-2 max-w-none')}>{p.body}</Markdown>
  );
  const facts = <Facts title={p.factsTitle} facts={p.facts} />;
  const hasFacts = p.facts?.length > 0;
  const side = ['left', 'right'].includes(p.imageSide) && p.image !== undefined;

  if (side) {
    const w = Math.min(60, Math.max(20, Number(p.imageWidth) || 38));
    return (
      <div className="grid items-start gap-10 md:gap-14" style={{ gridTemplateColumns: 'var(--rt-cols)' }}>
        <style
          dangerouslySetInnerHTML={{
            __html: `[data-section="${section.id}"]{--rt-cols:minmax(0,1fr)}@media(min-width:768px){[data-section="${section.id}"]{--rt-cols:${p.imageSide === 'left' ? `${w}% minmax(0,1fr)` : `minmax(0,1fr) ${w}%`}}}`,
          }}
        />
        <div className={cx('mx-auto w-full max-w-[340px] md:max-w-none', p.imageSide === 'right' && 'md:order-2')}>
          <Figure p={p} />
        </div>
        <div className="min-w-0 space-y-8">
          {text}
          {facts}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {p.imageSide === 'top' && <Figure p={p} />}
      {hasFacts ? (
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)] lg:gap-16">
          {text}
          {facts}
        </div>
      ) : (
        text
      )}
    </div>
  );
}
