'use client';
/**
 * Site-wide design and details: theme, colours, fonts, sizes, navigation,
 * side panel, footer, contact information and profile links. Edits preview
 * live across the whole site; “Save design” stores them.
 */
import { ColorInput, FieldList, Label, ListEditor } from '@/components/editor/Fields';
import { cursorStyleOf } from '@/lib/cursorStyles';
import CursorPicker from './CursorPicker';
import NavPreview from './NavPreview';
import { getState, saveConfig, useConfig } from '@/lib/store';
import { BODY_FONTS, COLOR_TOKENS, HEADING_FONTS, PRESETS, themeColors, themeVars, fontsHref } from '@/lib/themes';
import { clone, cx } from '@/lib/utils';
import { Loader2, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

const slug = (t) => t.toLowerCase().replace(/[^a-z]+/g, '-');
const JUMP = ['Theme', 'Typography and shape', 'Navigation bar', 'Navigation and side panel', 'Motion', 'Pointer', 'Site details', 'Contact information', 'Profile links', 'Footer'];

function Card({ title, children, note }) {
  return (
    <section id={`design-${slug(title)}`} className="ui-card scroll-mt-44 space-y-4 p-5">
      <div>
        <h3 className="text-[15px] font-semibold">{title}</h3>
        {note && <p className="ui-help">{note}</p>}
      </div>
      {children}
    </section>
  );
}

/** Apply a theme to the page immediately, without saving. */
function preview(theme) {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(themeVars(theme))) root.style.setProperty(k, v);
  const link = document.getElementById('tfs-fonts');
  if (link) link.setAttribute('href', fontsHref(theme.fonts));
}

export default function DesignPanel() {
  const saved = useConfig();
  const [cfg, setCfg] = useState(() => clone(saved));
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(cfg) !== JSON.stringify(saved);

  useEffect(() => {
    if (!dirty) setCfg(clone(saved));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);

  useEffect(() => {
    preview(cfg.theme);
  }, [cfg.theme]);

  // Leaving the tab without saving restores the saved theme.
  useEffect(() => () => preview(getState().config.theme), []);

  const set = (path, value) => setCfg((c) => {
    const next = clone(c);
    const keys = path.split('.');
    let cur = next;
    keys.slice(0, -1).forEach((k) => (cur = cur[k] ??= {}));
    cur[keys.at(-1)] = value;
    return next;
  });

  const save = async () => {
    setSaving(true);
    try {
      await saveConfig(cfg);
      toast.success('Design saved');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const colors = themeColors(cfg.theme);
  const theme = cfg.theme || {};

  return (
    <div className="space-y-5 pb-6">
      <nav className="-mx-1 flex gap-1.5 overflow-x-auto rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-sm backdrop-blur" aria-label="Jump to">
        {JUMP.map((t) => (
          <a key={t} href={`#design-${slug(t)}`} className="shrink-0 rounded-lg px-2.5 py-1 text-[12.5px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900">
            {t}
          </a>
        ))}
      </nav>
      <Card title="Theme" note="Pick a starting palette, then adjust any colour below.">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => set('theme', { ...theme, preset: p.id, custom: null })}
              className={cx('rounded-xl border p-2 text-left transition', theme.preset === p.id ? 'border-[#0d7a6f] ring-2 ring-[#0d7a6f]/20' : 'border-slate-200 hover:border-slate-400')}
            >
              <span className="flex h-12 overflow-hidden rounded-lg" style={{ background: p.colors['--bg-primary'] }}>
                <span className="m-2 flex-1 rounded" style={{ background: p.colors['--card-bg'], border: `1px solid ${p.colors['--border']}` }}>
                  <span className="mx-2 mt-2 block h-1.5 w-10 rounded" style={{ background: p.colors['--text-primary'] }} />
                  <span className="mx-2 mt-1.5 block h-1.5 w-6 rounded" style={{ background: p.colors['--accent'] }} />
                </span>
              </span>
              <span className="mt-1.5 block text-[13px] font-semibold">{p.name}</span>
              <span className="block text-[11.5px] text-slate-500">{p.note}</span>
            </button>
          ))}
        </div>
        <details className="rounded-lg border border-slate-200 p-3" open={theme.preset === 'custom'}>
          <summary className="cursor-pointer text-[13px] font-semibold">Customise colours {theme.preset === 'custom' && '(custom theme active)'}</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {COLOR_TOKENS.map(([token, label]) => (
              <div key={token}>
                <Label>{label}</Label>
                <ColorInput value={colors[token]} onChange={(v) => set('theme', { ...theme, preset: 'custom', custom: { ...colors, [token]: v || colors[token] } })} />
              </div>
            ))}
          </div>
        </details>
      </Card>

      <Card title="Typography and shape">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Heading font</Label>
            <select className="ui-input" value={theme.fonts?.heading} onChange={(e) => set('theme.fonts.heading', e.target.value)}>
              {HEADING_FONTS.map((f) => (
                <option key={f.name}>{f.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Body font</Label>
            <select className="ui-input" value={theme.fonts?.body} onChange={(e) => set('theme.fonts.body', e.target.value)}>
              {BODY_FONTS.map((f) => (
                <option key={f.name}>{f.name}</option>
              ))}
            </select>
          </div>
          <FieldList
            value={cfg}
            onChange={setCfg}
            fields={[
              { key: 'theme.baseSize', label: 'Base text size (px)', type: 'range', min: 14, max: 21 },
              { key: 'theme.radius', label: 'Corner roundness (px)', type: 'range', min: 0, max: 32 },
              { key: 'theme.container', label: 'Page width (px)', type: 'range', min: 900, max: 1500, step: 20 },
            ]}
          />
        </div>
      </Card>

      <Card title="Navigation bar" note="How the menu bar at the top of every page looks. The preview updates as you change it.">
        <NavPreview cfg={cfg} />
        <FieldList
          value={cfg}
          onChange={setCfg}
          fields={[
            {
              key: 'nav.tabStyle',
              label: 'Tab style',
              type: 'segmented',
              options: [
                { value: 'pills', label: 'Pills' },
                { value: 'underline', label: 'Underline' },
                { value: 'minimal', label: 'Minimal text' },
                { value: 'boxed', label: 'Boxed' },
              ],
            },
            { key: 'nav.showIcons', label: 'Show icons next to tab names', type: 'toggle' },
            { key: 'nav.textSize', label: 'Text size', type: 'segmented', options: [{ value: 'sm', label: 'Small' }, { value: 'md', label: 'Medium' }, { value: 'lg', label: 'Large' }] },
            { key: 'nav.height', label: 'Bar height (px)', type: 'range', min: 52, max: 88, step: 2 },
            { group: 'Colour and transparency' },
            {
              key: 'nav.theme',
              label: 'Colour theme',
              type: 'segmented',
              options: [
                { value: 'page', label: 'Page' },
                { value: 'soft', label: 'Soft' },
                { value: 'card', label: 'Card' },
                { value: 'contrast', label: 'Dark' },
                { value: 'accent', label: 'Accent' },
                { value: 'custom', label: 'Custom' },
              ],
              help: 'Page, Soft and Card follow the site theme; Dark and Accent invert it so text stays readable.',
            },
            { key: 'nav.bgColor', label: 'Bar colour', type: 'color', when: (c) => c.nav?.theme === 'custom' },
            { key: 'nav.textColor', label: 'Text colour (empty = automatic)', type: 'color', when: (c) => c.nav?.theme === 'custom' },
            { key: 'nav.opacity', label: 'Opacity (%)', type: 'range', min: 0, max: 100, step: 5, help: '100 = solid. Lower lets the page show through.' },
            { key: 'nav.blur', label: 'Background blur (px)', type: 'range', min: 0, max: 24, help: 'Frosted-glass effect behind a see-through bar. 0 = none.' },
            { key: 'nav.topTransparent', label: 'Fully clear at the top of the page (colour appears when scrolling)', type: 'toggle' },
            {
              key: 'nav.divider',
              label: 'Line under the bar',
              type: 'segmented',
              options: [
                { value: 'scroll', label: 'When scrolling' },
                { value: 'always', label: 'Always' },
                { value: 'never', label: 'Never' },
              ],
            },
            { key: 'nav.markShape', label: 'Monogram shape', type: 'segmented', options: [{ value: 'circle', label: 'Circle' }, { value: 'rounded', label: 'Rounded' }, { value: 'square', label: 'Square' }] },
          ]}
        />
      </Card>

      <Card title="Navigation and side panel">
        <FieldList
          value={cfg}
          onChange={setCfg}
          fields={[
            { key: 'brand.name', label: 'Name in the menu bar', type: 'text' },
            { key: 'brand.mark', label: 'Monogram', type: 'text' },
            { key: 'brand.showMark', label: 'Show monogram', type: 'toggle' },
            { key: 'nav.maxVisible', label: 'Tabs shown before “More”', type: 'range', min: 3, max: 12 },
            { key: 'nav.align', label: 'Menu position', type: 'segmented', options: ['right', 'center'] },
            { key: 'nav.sticky', label: 'Keep the menu at the top while scrolling', type: 'toggle' },
            { key: 'drawer.side', label: 'Side panel opens from', type: 'segmented', options: ['left', 'right'] },
            { key: 'drawer.width', label: 'Side panel default width (% of window)', type: 'range', min: 40, max: 95, help: 'Visitors can still drag it wider or narrower.' },
          ]}
        />
      </Card>

      <Card title="Motion" note="Visitors who ask their device for reduced motion never see these.">
        <FieldList
          value={cfg}
          onChange={setCfg}
          fields={[
            {
              key: 'effects.scroll',
              label: 'Sections appear while scrolling with',
              type: 'segmented',
              options: [
                { value: 'none', label: 'No effect' },
                { value: 'fade', label: 'Fade' },
                { value: 'rise', label: 'Rise' },
                { value: 'genie', label: 'Genie' },
              ],
              help: 'Applies to every section set to “Site default”.',
            },
          ]}
        />
      </Card>

      <Card title="Pointer" note="How the mouse pointer looks on the public site. Pick a style, try it in the box, then press Save design.">
        <CursorPicker
          value={cursorStyleOf(cfg.effects)}
          onChange={(v) => setCfg((c) => ({ ...c, effects: { ...(c.effects || {}), cursorStyle: v, cursor: v !== 'none' } }))}
        />
      </Card>

      <Card title="Site details">
        <FieldList
          value={cfg}
          onChange={setCfg}
          fields={[
            { key: 'site.title', label: 'Site title (browser tab)', type: 'text' },
            { key: 'site.description', label: 'Description for search engines', type: 'textarea', rows: 2 },
            { key: 'person.honorific', label: 'Honorific', type: 'text' },
            { key: 'person.name', label: 'Full name', type: 'text' },
            { key: 'person.citeAs', label: 'Name as it appears in author lists (shown in bold)', type: 'text' },
            { key: 'person.photo', label: 'Default photo', type: 'image' },
          ]}
        />
      </Card>

      <Card title="Contact information" note="Used by Contact sections and the footer.">
        <FieldList
          value={cfg}
          onChange={setCfg}
          fields={[
            { key: 'contact.email', label: 'Email', type: 'text' },
            { key: 'contact.phone', label: 'Phone', type: 'text' },
            { key: 'contact.address', label: 'Address', type: 'textarea', rows: 3 },
            { key: 'contact.hours', label: 'Office hours', type: 'text' },
            { key: 'contact.mapUrl', label: 'Map embed link', type: 'text', help: 'Google Maps, Share, Embed a map, copy the src link.' },
          ]}
        />
      </Card>

      <Card title="Profile links">
        <ListEditor
          value={cfg.socials}
          onChange={(v) => set('socials', v)}
          itemLabel={(s) => s.label || 'Link'}
          addLabel="Add link"
          newItem={() => ({ label: 'Website', url: 'https://', icon: 'Globe' })}
          fields={[
            { key: 'label', label: 'Label', type: 'text' },
            { key: 'url', label: 'Link (https:// or mailto:)', type: 'text' },
            { key: 'icon', label: 'Icon', type: 'icon' },
          ]}
        />
      </Card>

      <Card title="Footer">
        <FieldList
          value={cfg}
          onChange={setCfg}
          fields={[
            { key: 'footer.line', label: 'Line after your name', type: 'text' },
            { key: 'footer.note', label: 'Small note', type: 'text' },
            { key: 'footer.showSocials', label: 'Show profile links', type: 'toggle' },
          ]}
        />
      </Card>

      <div className="sticky bottom-20 z-20 mx-auto flex lg:bottom-4 w-max max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-xl">
        <span className="px-2 text-[12.5px] text-slate-600">{dirty ? 'Unsaved design changes (previewing)' : 'Design saved'}</span>
        <button type="button" className="ui-btn" disabled={!dirty} onClick={() => setCfg(clone(saved))} data-tip="Undo|Go back to the last saved design.">
          <RotateCcw size={14} /> Undo
        </button>
        <button type="button" className="ui-btn ui-btn-accent" disabled={!dirty || saving} onClick={save} data-tip="Save design|Publish these design changes to the whole site.">
          {saving && <Loader2 size={14} className="animate-spin" />} Save design
        </button>
      </div>
    </div>
  );
}
