'use client';
/** Accessible centred dialog: Escape closes, focus moves in and returns. */
import { cx } from '@/lib/utils';
import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';

// Open dialogs, newest last: Escape only closes the one on top.
const stack = [];

export default function Modal({ open, onClose, title, children, footer, size = 'md', className = '' }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    const token = {};
    stack.push(token);
    ref.current?.querySelector('input, textarea, select, button')?.focus();
    const onKey = (e) => e.key === 'Escape' && stack[stack.length - 1] === token && closeRef.current?.();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      stack.splice(stack.indexOf(token), 1);
      prev?.focus?.();
    };
  }, [open]);
  if (!open) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' };
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div ref={ref} className={cx('ui relative flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white text-slate-900 shadow-2xl sm:rounded-2xl', widths[size], className)}>
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-base font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="ui-icon-btn" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}
