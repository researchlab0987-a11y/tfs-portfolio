'use client';
/**
 * One component for every clickable thing an editor can configure.
 *
 *   drawer  open a tab in the side panel     target: page slug
 *   page    navigate to a tab                target: page slug
 *   scroll  smooth-scroll to an anchor       target: anchor id
 *   url     open a link (new tab if external) target: https://…
 *   email   start an email                   target: address
 */
import { useDrawer } from '@/context/DrawerContext';
import { cx, isExternal } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import Icon from './Icon';

const STYLES = {
  solid: 'btn btn-solid',
  outline: 'btn btn-outline',
  link: 'btn-link',
  plain: '',
};

export function pageHref(slug) {
  return !slug || slug === 'home' ? '/' : `/${slug}`;
}

export function resolveAction({ action, target }) {
  switch (action) {
    case 'page':
    case 'drawer':
      return pageHref(target);
    case 'scroll':
      return `#${String(target || '').replace(/^#/, '')}`;
    case 'email':
      return `mailto:${String(target || '').replace(/^mailto:/, '')}`;
    case 'url':
      return target || '#';
    default:
      return target || '#';
  }
}

export default function ActionButton({ action = 'url', target = '', label, icon, style = 'solid', className = '', children, onDone }) {
  const drawer = useDrawer();
  const router = useRouter();
  const href = resolveAction({ action, target });
  const external = action === 'url' && isExternal(target);

  const onClick = (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return; // let new-tab clicks through
    if (action === 'drawer' && target) {
      e.preventDefault();
      drawer.openPage(target);
    } else if (action === 'page') {
      e.preventDefault();
      drawer.dismiss();
      router.push(href);
    } else if (action === 'scroll') {
      const el = document.getElementById(String(target).replace(/^#/, ''));
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      }
    }
    onDone?.();
  };

  return (
    <a
      href={href}
      onClick={onClick}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className={cx(STYLES[style] ?? STYLES.solid, className)}
    >
      {icon && <Icon name={icon} size={16} strokeWidth={1.8} />}
      <span>{children || label}</span>
    </a>
  );
}
