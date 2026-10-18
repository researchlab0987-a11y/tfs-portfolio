'use client';
/**
 * Thin accent bar at the top of the window while a tab is opening. It starts
 * the moment an internal link is clicked (so the click always feels answered)
 * and finishes when the new route is on screen.
 */
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

function Bar() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [phase, setPhase] = useState('idle'); // idle | loading | done
  const timers = useRef([]);

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => {
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest?.('a[href]');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      clear();
      setPhase('loading');
      // Safety net: never leave the bar hanging if navigation is cancelled.
      timers.current.push(setTimeout(() => setPhase('done'), 8000));
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  useEffect(() => {
    setPhase((p) => (p === 'loading' ? 'done' : p));
  }, [pathname, search]);

  useEffect(() => {
    if (phase !== 'done') return undefined;
    clear();
    const t = setTimeout(() => setPhase('idle'), 450);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => clear, []);

  if (phase === 'idle') return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[90] h-[3px]" aria-hidden="true">
      <div className={phase === 'loading' ? 'nav-progress nav-progress-run' : 'nav-progress nav-progress-done'} />
    </div>
  );
}

export default function NavProgress() {
  return (
    <Suspense fallback={null}>
      <Bar />
    </Suspense>
  );
}
