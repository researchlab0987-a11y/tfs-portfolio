'use client';
/**
 * SectionFrame
 *
 * The band every section sits in. It turns `section.style` into real CSS
 * (tone, background, spacing, width, motion, visibility, custom CSS), draws
 * the heading and the "view all" link, and in edit mode adds the toolbar.
 * Section kinds only render their own content.
 */
import ActionButton from '@/components/ui/ActionButton';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import Markdown from '@/components/ui/Markdown';
import { KINDS } from '@/lib/sections';
import { useConfig } from '@/lib/store';
import { useAdmin } from '@/context/AdminContext';
import { cx } from '@/lib/utils';
import { useEffect, useRef, useState } from 'react';
import SectionToolbar from './SectionToolbar';
import { SECTION_COMPONENTS } from '@/components/sections';

const WIDTHS = {
  narrow: 'max-w-[780px]',
  normal: 'max-w-site',
  wide: 'max-w-[1400px]',
  full: 'max-w-none',
};

const TITLE_SIZES = {
  sm: 'text-[1.45rem] md:text-[1.6rem]',
  md: 'text-[1.8rem] md:text-[2.25rem]',
  lg: 'text-[2.1rem] md:text-[2.9rem]',
  xl: 'text-[2.5rem] md:text-[3.7rem]',
};

function sanitizeCss(css) {
  return String(css || '').replace(/<\/?style/gi, '');
}

function scopedCss(id, css) {
  const clean = sanitizeCss(css).trim();
  if (!clean) return '';
  const sel = `[data-section="${id}"]`;
  if (clean.includes('{')) return clean.replace(/&/g, sel);
  return `${sel}{${clean}}`;
}

function backgroundStyle(style) {
  if (style.tone !== 'custom') return {};
  const out = {};
  if (style.bgType === 'gradient' && style.bgColor) {
    out.background = `linear-gradient(${style.bgAngle || 135}deg, ${style.bgColor}, ${style.bgColor2 || style.bgColor})`;
  } else if (style.bgType === 'image' && style.bgImage) {
    out.backgroundImage = `url("${String(style.bgImage).replace(/"/g, '')}")`;
    out.backgroundSize = 'cover';
    out.backgroundPosition = 'center';
  } else if (style.bgColor) {
    out.background = style.bgColor;
  }
  if (style.textColor) {
    out['--text-primary'] = style.textColor;
    out['--text-secondary'] = `color-mix(in srgb, ${style.textColor} 82%, transparent)`;
    out['--text-muted'] = `color-mix(in srgb, ${style.textColor} 60%, transparent)`;
    out.color = style.textColor;
  }
  return out;
}

function useReveal(kind) {
  const ref = useRef(null);
  const [shown, setShown] = useState(kind === 'none');
  const [settled, setSettled] = useState(kind === 'none');
  useEffect(() => {
    if (!shown || settled) return undefined;
    // Once played, drop the clip/transform so shadows and menus are not cut off.
    const t = setTimeout(() => setSettled(true), 700);
    return () => clearTimeout(t);
  }, [shown, settled]);
  useEffect(() => {
    if (kind === 'none' || !ref.current) return undefined;
    if (typeof IntersectionObserver === 'undefined') return setShown(true);
    const io = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && (setShown(true), io.disconnect()),
      // Start as soon as the section's edge enters the screen.
      { rootMargin: '0px 0px -24px 0px', threshold: 0 }
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [kind]);
  return [ref, shown, settled];
}

export function SectionHeading({ heading, className = '' }) {
  if (!heading?.show || (!heading.title && !heading.subtitle && !heading.eyebrow)) return null;
  const align = { left: 'text-left', center: 'text-center mx-auto', right: 'text-right ml-auto' }[heading.align] || 'text-left';
  return (
    <header className={cx('mb-10 max-w-3xl', align, className)}>
      {heading.eyebrow && <p className="mb-2 text-[0.92rem] font-medium text-accent">{heading.eyebrow}</p>}
      {heading.title && (
        <h2 className={cx('font-heading font-medium leading-[1.1] text-ink', TITLE_SIZES[heading.size] || TITLE_SIZES.md)}>{heading.title}</h2>
      )}
      {heading.style === 'rule' && heading.title && (
        <span className={cx('mt-4 block h-[3px] w-14 rounded-full bg-accent', heading.align === 'center' && 'mx-auto', heading.align === 'right' && 'ml-auto')} />
      )}
      {heading.subtitle && <Markdown className="mt-3 text-[1.05rem] text-ink2">{heading.subtitle}</Markdown>}
    </header>
  );
}

export default function SectionFrame({ section, page, index, total, inDrawer = false, editMode = false, isDraft = false, isEditing = false }) {
  const style = section.style;
  const kind = KINDS[section.kind];
  const Component = SECTION_COMPONENTS[section.kind];
  const siteConfig = useConfig();
  const { can } = useAdmin();
  const canSections = can('sections');
  const chosen = !style.animation || style.animation === 'auto' || style.animation === 'none' ? siteConfig.effects?.scroll || 'none' : style.animation;
  const animation = editMode || inDrawer || chosen === 'off' ? 'none' : chosen;
  const [ref, shown, settled] = useReveal(animation);

  const tone = style.tone && style.tone !== 'inherit' && style.tone !== 'custom' ? `tone-${style.tone}` : '';
  const hasImageBg = style.tone === 'custom' && style.bgType === 'image' && style.bgImage;
  const radius = String(style.radius ?? '').trim();
  const sectionStyle = {
    ...backgroundStyle(style),
    ...(style.accentColor ? { '--accent': style.accentColor, '--accent-hover': style.accentColor, '--accent-light': `color-mix(in srgb, ${style.accentColor} 14%, transparent)` } : {}),
    ...(radius !== '' && !Number.isNaN(Number(radius)) ? { '--radius': `${Number(radius)}px` } : {}),
    ...(style.minHeight ? { minHeight: `${style.minHeight}svh` } : {}),
  };
  const padTop = Number(style.paddingTop) || 0;
  const padBottom = Number(style.paddingBottom) || 0;
  const pad = inDrawer ? 0.6 : 1;

  const showHeading = kind?.hasHeading !== false;
  const side = showHeading && section.heading.style === 'side' && section.heading.show;
  const hiddenForVisitors = section.hidden;

  const content = (
    <ErrorBoundary showError={editMode} label={kind?.label} resetKey={JSON.stringify(section).length}>
      {Component ? <Component section={section} page={page} inDrawer={inDrawer} editMode={editMode} /> : null}
    </ErrorBoundary>
  );

  return (
    <section
      id={style.anchor || undefined}
      data-section={section.id}
      className={cx(
        'group/sec relative isolate',
        tone,
        style.hideMobile && 'hide-mobile',
        style.hideDesktop && 'hide-desktop',
        style.borderTop && 'border-t border-line',
        style.borderBottom && 'border-b border-line',
        hiddenForVisitors && editMode && 'opacity-50',
        isEditing && !inDrawer && 'studio-target',
        style.className
      )}
      style={sectionStyle}
    >
      {hasImageBg && <div className="absolute inset-0 -z-10 bg-black" style={{ opacity: Number(style.overlay) || 0 }} aria-hidden="true" />}
      {editMode && !inDrawer && canSections && <SectionToolbar section={section} page={page} index={index} total={total} isDraft={isDraft} />}

      <div
        ref={ref}
        className={cx(
          'mx-auto w-full',
          WIDTHS[style.width] || WIDTHS.normal,
          inDrawer ? 'px-5 md:px-10' : 'px-5 md:px-8',
          animation === 'fade' && 'reveal-fade',
          animation === 'rise' && 'reveal-rise',
          animation === 'genie' && 'reveal-genie',
          shown && 'revealed',
          settled && 'reveal-settled',
          style.contentAlign === 'center' && 'text-center'
        )}
        style={{
          paddingTop: `clamp(${Math.round(padTop * 0.55 * pad)}px, 7vw, ${Math.round(padTop * pad)}px)`,
          paddingBottom: `clamp(${Math.round(padBottom * 0.55 * pad)}px, 7vw, ${Math.round(padBottom * pad)}px)`,
          fontSize: style.fontScale && Number(style.fontScale) !== 1 ? `${Number(style.fontScale)}em` : undefined,
        }}
      >
        {side ? (
          <div className="grid gap-x-12 lg:grid-cols-[minmax(220px,1fr)_3fr]">
            <SectionHeading heading={{ ...section.heading, align: 'left' }} className="lg:sticky lg:top-24 lg:self-start" />
            <div className="min-w-0">{content}</div>
          </div>
        ) : (
          <>
            {showHeading && <SectionHeading heading={section.heading} />}
            {content}
          </>
        )}

        {section.viewAll.show && section.viewAll.target && !(inDrawer && section.viewAll.target === page?.id) && (
          <div className={cx('mt-10', section.heading.align === 'center' && 'text-center')}>
            <ActionButton action={section.viewAll.mode === 'page' ? 'page' : 'drawer'} target={section.viewAll.target} style="link">
              {section.viewAll.label || 'View all'}
            </ActionButton>
          </div>
        )}
      </div>

      {style.customCss && <style dangerouslySetInnerHTML={{ __html: scopedCss(section.id, style.customCss) }} />}
    </section>
  );
}
