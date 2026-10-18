'use client';
/** Large figures. Each one is a fixed value or a live count of a collection. */
import { useItemsMap } from '@/lib/store';
import { cx } from '@/lib/utils';
import { useMemo } from 'react';

const SIZES = { md: 'text-[2.2rem]', lg: 'text-[2.8rem] md:text-[3.4rem]', xl: 'text-[3.4rem] md:text-[4.4rem]' };

export default function StatsSection({ section }) {
  const p = section.props;
  const items = useItemsMap();
  const stats = useMemo(
    () =>
      (p.items || []).map((s) => {
        if (!s.source) return s;
        const count = Object.values(items).filter(
          (it) =>
            it.collection === s.source &&
            !it.hidden &&
            (!s.filterField || String(it[s.filterField] ?? '').toLowerCase() === String(s.filterValue ?? '').toLowerCase())
        ).length;
        return { ...s, value: String(count) };
      }),
    [p.items, items]
  );
  if (!stats.length) return null;
  return (
    <dl className={cx('grid grid-cols-2 gap-y-8 md:flex md:flex-wrap', p.align === 'center' && 'text-center md:justify-center')}>
      {stats.map((s, i) => (
        <div key={`${s.label}-${i}`} className={cx('px-0 md:min-w-[10rem] md:flex-1 md:px-8 md:first:pl-0', p.dividers && i > 0 && 'md:border-l md:border-line', p.align === 'center' && 'md:first:pl-8')}>
          <dd className={cx('font-heading font-medium leading-none tabular-nums text-ink', SIZES[p.size] || SIZES.lg)}>
            {s.value}
            {s.suffix && <span className="text-accent">{s.suffix}</span>}
          </dd>
          <dt className="mt-2 text-[0.92rem] text-ink2">{s.label}</dt>
        </div>
      ))}
    </dl>
  );
}
