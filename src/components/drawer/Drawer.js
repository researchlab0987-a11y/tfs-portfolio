'use client';
/**
 * The side panel. Opens from the side set in Design (visitors can swap it
 * with the button in its header; their choice is remembered) at 75% of the
 * window by default; on phones it is a bottom sheet instead (half the
 * screen, drag its handle to resize, drag down to close); drag its edge, or focus the edge and use the arrow keys, to resize.
 * Double-click the edge to reset. On phones it covers the full width.
 */
import PageView from '@/components/page/PageView';
import { useDrawer } from '@/context/DrawerContext';
import { usePage, useConfig, useItemsMap, useSchema } from '@/lib/store';
import { cx, safeLocalStorage } from '@/lib/utils';
import { ArrowLeft, Link2, Maximize2, PanelLeft, PanelRight, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import ItemDetail from './ItemDetail';
import { SheetHandle, useSheetHeight } from '@/components/ui/BottomSheet';
import { pageHref } from '@/components/ui/ActionButton';

const SIDE_KEY = 'tfs:drawer-side';

function useTitle(view) {
  const page = usePage(view?.type === 'page' ? view.slug : '__none__');
  const items = useItemsMap();
  const schema = useSchema();
  if (!view) return '';
  if (view.type === 'page') return page?.title || '';
  const item = items[view.id];
  return schema.collections?.[item?.collection]?.label || '';
}

export default function Drawer() {
  const drawer = useDrawer();
  const config = useConfig();
  const router = useRouter();
  const { current, isOpen, stack, width, setWidth, close, back } = drawer;
  const [ownSide, setOwnSide] = useState(null); // this browser's choice
  useEffect(() => {
    try {
      const v = safeLocalStorage()?.getItem(SIDE_KEY);
      if (v === 'left' || v === 'right') setOwnSide(v);
    } catch {
      // Storage blocked: use the site default.
    }
  }, []);
  const side = ownSide || (config.drawer?.side === 'right' ? 'right' : 'left');
  const [swapping, setSwapping] = useState(false);
  const swapSide = () => {
    const next = side === 'left' ? 'right' : 'left';
    // Slide out, switch, slide back in from the other side.
    setSwapping(true);
    setTimeout(() => {
      setOwnSide(next);
      try {
        safeLocalStorage()?.setItem(SIDE_KEY, next);
      } catch {
        // Not remembered, but still switched for now.
      }
      requestAnimationFrame(() => requestAnimationFrame(() => setSwapping(false)));
    }, 220);
  };
  const panelRef = useRef(null);
  const scrollRef = useRef(null);
  // Phones get a bottom sheet instead of a side panel.
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setPhone(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);
  const sheet = useSheetHeight('drawer', 50, close);
  const [entered, setEntered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const title = useTitle(current);

  useEffect(() => {
    if (!isOpen) return setEntered(false);
    const t = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(t);
  }, [isOpen]);

  // Lock page scroll, close on Escape, move focus into the panel.
  useEffect(() => {
    if (!isOpen) return undefined;
    const prevOverflow = document.body.style.overflow;
    const prevFocus = document.activeElement;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape' && !document.querySelector('[aria-modal="true"]')) close();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
      prevFocus?.focus?.();
    };
  }, [isOpen, close]);

  // New view: start at the top.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [current]);

  const onPointerDown = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(true);
      const move = (ev) => {
        const x = ev.clientX;
        const pct = side === 'left' ? (x / window.innerWidth) * 100 : ((window.innerWidth - x) / window.innerWidth) * 100;
        setWidth(pct);
      };
      const up = () => {
        setDragging(false);
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    },
    [side, setWidth]
  );

  const onHandleKey = (e) => {
    const step = e.shiftKey ? 10 : 3;
    const grow = side === 'left' ? 'ArrowRight' : 'ArrowLeft';
    const shrink = side === 'left' ? 'ArrowLeft' : 'ArrowRight';
    if (e.key === grow) setWidth(width + step);
    else if (e.key === shrink) setWidth(width - step);
    else return;
    e.preventDefault();
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy the link.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="false" aria-label={title || 'Details'}>
      <div
        className={cx('absolute inset-0 bg-[#0b1220]/40 transition-opacity duration-300', entered ? 'opacity-100' : 'opacity-0')}
        onClick={close}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cx(
          'absolute flex flex-col bg-bg shadow-2xl outline-none',
          phone
            ? cx(
                'inset-x-0 bottom-0 rounded-t-[22px] border-t border-line',
                !sheet.dragging && 'transition-[transform,height] duration-300 ease-[cubic-bezier(.22,1,.36,1)]',
                entered ? 'translate-y-0' : 'translate-y-full'
              )
            : cx(
                'inset-y-0 w-[var(--drawer-w)]',
                side === 'left' ? 'left-0' : 'right-0',
                !dragging && 'transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)]',
                entered && !swapping ? 'translate-x-0' : side === 'left' ? '-translate-x-full' : 'translate-x-full'
              ),
          (dragging || sheet.dragging) && 'select-none'
        )}
        style={phone ? { height: `${sheet.height}dvh`, paddingBottom: 'env(safe-area-inset-bottom, 0px)' } : { '--drawer-w': `${width}vw` }}
      >
        {phone && (
          <div {...sheet.dragProps} className="shrink-0 cursor-grab select-none active:cursor-grabbing">
            <SheetHandle handleProps={sheet.handleProps} className="!pb-0" />
          </div>
        )}
        <div
          {...(phone ? sheet.dragProps : {})}
          className={cx('flex shrink-0 items-center gap-2 border-b border-line bg-bg/95 px-3 backdrop-blur md:px-5', phone ? 'h-12' : 'h-14')}
        >
          {stack.length > 1 && (
            <button type="button" onClick={back} className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[0.9rem] text-ink2 hover:bg-bg2 hover:text-ink">
              <ArrowLeft size={17} /> Back
            </button>
          )}
          <p className="min-w-0 flex-1 truncate px-1 text-[0.92rem] font-medium text-ink2">{title}</p>
          <button
            type="button"
            onClick={swapSide}
            className="hidden h-9 w-9 place-items-center rounded-md text-ink2 hover:bg-bg2 hover:text-ink md:grid"
            aria-label={`Move panel to the ${side === 'left' ? 'right' : 'left'}`}
            title={`Move panel to the ${side === 'left' ? 'right' : 'left'}`}
          >
            {side === 'left' ? <PanelRight size={17} /> : <PanelLeft size={17} />}
          </button>
          <button type="button" onClick={copyLink} className="grid h-9 w-9 place-items-center rounded-md text-ink2 hover:bg-bg2 hover:text-ink" aria-label="Copy link" title="Copy link">
            <Link2 size={17} />
          </button>
          {current?.type === 'page' && (
            <button
              type="button"
              onClick={() => {
                drawer.dismiss();
                router.push(pageHref(current.slug));
              }}
              className="grid h-9 w-9 place-items-center rounded-md text-ink2 hover:bg-bg2 hover:text-ink"
              aria-label="Open as a full page"
              title="Open as a full page"
            >
              <Maximize2 size={16} />
            </button>
          )}
          <button type="button" onClick={close} className="grid h-9 w-9 place-items-center rounded-md text-ink hover:bg-bg2" aria-label="Close panel">
            <X size={20} />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
          {current?.type === 'page' && <PageView slug={current.slug} inDrawer />}
          {current?.type === 'item' && <ItemDetail id={current.id} ids={current.ids} />}
        </div>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panel"
          aria-valuenow={width}
          aria-valuemin={30}
          aria-valuemax={96}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onKeyDown={onHandleKey}
          onDoubleClick={() => setWidth(Number(config.drawer?.width) || 75)}
          className={cx(
            'group absolute inset-y-0 hidden w-3 cursor-col-resize items-center justify-center md:flex',
            side === 'left' ? '-right-1.5' : '-left-1.5'
          )}
          title="Drag to resize, double-click to reset"
        >
          <span className={cx('h-16 w-1 rounded-full transition-colors', dragging ? 'bg-accent' : 'bg-line group-hover:bg-accent group-focus-visible:bg-accent')} />
        </div>
      </div>
    </div>
  );
}
