'use client';
/**
 * DrawerContext
 *
 * The side panel that opens instead of navigating. It holds a stack of views
 * so "back" inside the panel returns to the list you came from:
 *
 *   { type: 'item', id, ids? }   one content item (ids = its list, for prev/next)
 *   { type: 'page', slug }       a whole tab rendered inside the panel
 *
 * The top view is mirrored in the URL as ?view=item:<id> or ?view=page:<slug>,
 * so a panel can be shared as a link and the browser back button closes it.
 */
import { safeLocalStorage } from '@/lib/utils';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const DrawerContext = createContext(null);
const WIDTH_KEY = 'tfs:drawer-width';

const encode = (v) => (v.type === 'item' ? `item:${v.id}` : `page:${v.slug}`);
function decode(param) {
  if (!param) return null;
  const [type, ...rest] = param.split(':');
  const value = rest.join(':');
  if (!value) return null;
  if (type === 'item') return { type: 'item', id: value };
  if (type === 'page') return { type: 'page', slug: value };
  return null;
}

export function DrawerProvider({ children, defaultWidth = 75 }) {
  const [stack, setStack] = useState([]);
  const [width, setWidthState] = useState(defaultWidth);
  const pushed = useRef(0);

  // Restore width; open from the URL on first load.
  useEffect(() => {
    const saved = Number(safeLocalStorage()?.getItem(WIDTH_KEY));
    if (saved >= 30 && saved <= 96) setWidthState(saved);
    const initial = decode(new URLSearchParams(window.location.search).get('view'));
    if (initial) setStack([initial]);
  }, []);

  useEffect(() => {
    const onPop = () => {
      const view = decode(new URLSearchParams(window.location.search).get('view'));
      pushed.current = Math.max(0, pushed.current - 1);
      setStack((s) => {
        if (!view) return [];
        const idx = s.findIndex((v) => encode(v) === encode(view));
        return idx >= 0 ? s.slice(0, idx + 1) : [view];
      });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const writeUrl = useCallback((view, mode) => {
    try {
      const url = new URL(window.location.href);
      if (view) url.searchParams.set('view', encode(view));
      else url.searchParams.delete('view');
      if (mode === 'push') {
        window.history.pushState(null, '', url);
        pushed.current += 1;
      } else {
        window.history.replaceState(window.history.state, '', url);
      }
    } catch {
      /* URL sync is a nicety; never block opening the panel */
    }
  }, []);

  const open = useCallback(
    (view, { replace = false } = {}) => {
      setStack((s) => (replace && s.length ? [...s.slice(0, -1), view] : [...s, view]));
      writeUrl(view, replace ? 'replace' : 'push');
    },
    [writeUrl]
  );

  const back = useCallback(() => {
    setStack((s) => {
      const next = s.slice(0, -1);
      writeUrl(next[next.length - 1] || null, 'replace');
      return next;
    });
  }, [writeUrl]);

  const close = useCallback(() => {
    setStack([]);
    const n = pushed.current;
    pushed.current = 0;
    // Unwind the entries we pushed so the back button does not reopen the
    // panel; if the panel came from a shared link, just clean the URL.
    if (n > 0) window.history.go(-n);
    else writeUrl(null, 'replace');
  }, [writeUrl]);

  /** Clear the panel without touching history (used right before navigating). */
  const dismiss = useCallback(() => {
    setStack([]);
    pushed.current = 0;
  }, []);

  const setWidth = useCallback((w) => {
    const clamped = Math.min(96, Math.max(30, Math.round(w)));
    setWidthState(clamped);
    safeLocalStorage()?.setItem(WIDTH_KEY, String(clamped));
  }, []);

  const value = useMemo(
    () => ({
      stack,
      current: stack[stack.length - 1] || null,
      isOpen: stack.length > 0,
      open,
      openItem: (id, ids) => open({ type: 'item', id, ids }),
      openPage: (slug) => open({ type: 'page', slug }),
      replace: (view) => open(view, { replace: true }),
      back,
      close,
      dismiss,
      width,
      setWidth,
    }),
    [stack, open, back, close, dismiss, width, setWidth]
  );

  return <DrawerContext.Provider value={value}>{children}</DrawerContext.Provider>;
}

export function useDrawer() {
  const ctx = useContext(DrawerContext);
  if (!ctx) throw new Error('useDrawer must be used inside DrawerProvider');
  return ctx;
}
