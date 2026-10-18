'use client';
/**
 * Starts the data store and keeps <html> in sync with the saved theme.
 * Renders nothing.
 */
import { initStore, useConfig } from '@/lib/store';
import { fontsHref, luminance, themeVars } from '@/lib/themes';
import { useEffect } from 'react';

export default function Boot() {
  const config = useConfig();

  useEffect(() => {
    initStore();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const vars = themeVars(config.theme);
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
    root.style.colorScheme = luminance(vars['--bg-primary']) < 0.5 ? 'dark' : 'light';

    // Swap the font stylesheet. If Google Fonts is unreachable the stacks
    // fall back to system fonts and nothing else breaks.
    const href = fontsHref(config.theme?.fonts);
    let link = document.getElementById('tfs-fonts');
    if (!link) {
      link = document.createElement('link');
      link.id = 'tfs-fonts';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    if (link.getAttribute('href') !== href) link.setAttribute('href', href);
  }, [config.theme]);

  useEffect(() => {
    const desc = document.querySelector('meta[name="description"]');
    if (desc && config.site?.description) desc.setAttribute('content', config.site.description);
  }, [config.site?.description]);

  return null;
}
