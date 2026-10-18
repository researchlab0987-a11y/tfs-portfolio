---
name: editable-portfolio-design
description: Complete design system and build recipe for a self-editable personal / academic / professional website (Next.js + Tailwind + Firebase) - theme tokens, typography, section system, pill navbar with icons, mobile bottom sheets, side-panel drawer, genie scroll reveals, comet/ring/sparkle pointer styles, image drop-crop-compress pipeline, in-place editor and a sidebar admin dashboard with hover help. Use when the user asks to build a new portfolio, faculty, lab, researcher, doctor, consultant or small-business site "with the same design", or wants any of these patterns reused.
---

# Editable Portfolio Design System

This skill describes one complete, proven website design: what it looks like, how it behaves, how it is built, and the mistakes to avoid. Following it, you should be able to build a new site in the same style **without asking the user design questions**. Ask only for the content (name, sections, photos, colours if they have a brand) and the hosting choice.

Backend, data flow and deployment: read **ARCHITECTURE.md** (next to this file) before building the data layer, auth, rules, image hosting or release pipeline.

Reference implementation: the Dr. Tahsina Farah Sanam site (`tahsina-sanam-website`, Next.js 14 App Router). If that folder is available, read the files named below instead of re-inventing them.

---

## 1. Principles (apply these to every decision)

1. **Calm academic editorial look.** Light, quiet backgrounds, one accent colour, a serif display face for headings, a clean sans for text, generous whitespace, thin 1px lines instead of heavy boxes. Personality comes from motion and small details, not from decoration.
2. **Everything is editable by a non-technical owner.** Every visible word, image, colour, section, tab and list can be changed from the browser, either in place on the page or in the dashboard. No code changes for content.
3. **Never blank, never broken.** The site renders from bundled seed content first, then a browser cache, then the live database. Missing images fall back to initials. A failed database never blocks the public site.
4. **One accent, many tones.** All colour comes from 13 CSS variables. Sections can re-point those variables (soft, muted, contrast, accent bands) so every component inside stays correct automatically.
5. **Motion is purposeful and optional.** Entrances, page transitions and pointer effects are on by default, configurable in the dashboard, and always disabled for `prefers-reduced-motion` and on touch devices where they make no sense.
6. **Phone first for visitors, desk first for editing.** Phones get bottom sheets, compact headers and large tap targets. The dashboard works on phones but is optimised for a laptop.
7. **Explain the tools.** Every admin control has a hover tooltip; every dashboard section has a one-line summary and a "How this works" guide; new users get a checklist.

---

## 2. Stack and project layout

| Concern | Choice |
|---|---|
| Framework | Next.js 14 App Router, plain JavaScript (no TypeScript), `'use client'` for interactive parts |
| Styling | Tailwind CSS 3.4, colours/fonts mapped to CSS variables; a hand-written `globals.css` for tokens, tones, motion and admin UI classes |
| Icons | `lucide-react` (stroke icons, 1.8 stroke width in nav, size 14-20) |
| Markdown | `react-markdown` + `remark-gfm` |
| Toasts | `react-hot-toast`, bottom-center, 14px |
| Data | Firebase (Auth + Firestore), optional; full "local mode" without it |
| Images | Client-side pipeline (crop + Lanczos resize + WebP), stored on Cloudinary (unsigned preset) or inline as data URLs |
| Fonts | Google Fonts, chosen at runtime from a curated list |

```
src/
  app/            layout.js, page.js (home), [slug]/page.js (tabs, generateStaticParams),
                  template.js (page-enter wrapper), admin/page.js, login/page.js, globals.css
  components/
    layout/       Providers, Boot, Navbar, Footer, AdminBar, NavProgress, CursorFx
    page/         PageView (header band + sections), SectionFrame (tones, padding, reveal), SectionToolbar
    sections/     HeroSection, CollectionSection, RichTextSection, BlocksSection, StatsSection, ContactSection
    drawer/       Drawer (side panel / bottom sheet), ItemDetail
    editor/       Fields (form renderer), SectionEditor, ItemEditor, PageSettings, AddSectionDialog,
                  BlocksEditor, ImageEditorDialog
    admin/        AdminShell, AdminOverview, PagesManager, ContentManager, SchemaEditor,
                  DesignPanel, CursorPicker, MessagesPanel, DataPanel
    ui/           Modal, BottomSheet, TooltipLayer, SafeImage, Icon, Markdown, ActionButton, Waveform
  context/        AdminContext (auth, edit mode, open editors), DrawerContext (panel stack + URL sync)
  lib/            store (data layers), firebase, themes, sections (section kinds + forms), roles,
                  cloudinary, imagePipeline, imageResize, image.worker, cursorStyles, utils
  data/seed.js    all bundled content + config + collection schema
```

---

## 3. Colour system

### 3.1 The 13 tokens

Every theme is exactly these variables, written inline on `<html>` (and duplicated as `--base-*` so tones can invert without circular references):

| Token | Role |
|---|---|
| `--bg-primary` | Page background |
| `--bg-secondary` | Soft band, hover fill |
| `--bg-tertiary` | Deeper band, code blocks, image placeholders |
| `--card-bg` | Cards, inputs on the site |
| `--border` | All 1px lines |
| `--text-primary` | Headings, strong text |
| `--text-secondary` | Body text |
| `--text-muted` | Captions, dates, hints |
| `--accent` | Links, active states, buttons, focus ring |
| `--accent-hover` | Hovered accent |
| `--accent-light` | Accent tint (active nav pill, badges, selection) |
| `--accent-contrast` | Text on accent |
| `--highlight` | Secondary warm accent (rarely used; stars, special badges) |

Plus layout tokens: `--radius` (default 14px), `--base-size` (root font size, default 17px), `--container` (default 1180px), `--nav-h` (64px), `--font-heading`, `--font-body`.

Tailwind mapping (use these class names everywhere on the public site, never raw hex):

```js
colors: { bg:'var(--bg-primary)', bg2:'var(--bg-secondary)', bg3:'var(--bg-tertiary)',
  ink:'var(--text-primary)', ink2:'var(--text-secondary)', muted:'var(--text-muted)',
  accent:'var(--accent)', 'accent-hover':'var(--accent-hover)', 'accent-light':'var(--accent-light)',
  'accent-contrast':'var(--accent-contrast)', line:'var(--border)', card:'var(--card-bg)', highlight:'var(--highlight)' },
fontFamily: { heading:'var(--font-heading)', body:'var(--font-body)' },
borderRadius: { card:'var(--radius)' }, maxWidth: { site:'var(--container)' }
```

Note: Tailwind opacity modifiers (`bg-accent/20`) do **not** work with `var()` colours. Use `color-mix(in srgb, var(--accent) 20%, transparent)` in CSS or arbitrary values instead.

### 3.2 Presets (order: bg, bg2, bg3, card, border, text, text2, muted, accent, accentHover, accentLight, accentContrast, highlight)

| Preset | Feel | Values |
|---|---|---|
| **Signal** (default) | Cool mist, navy ink, jade | `#F4F6F8 #E9EEF2 #DCE3E9 #FFFFFF #D3DBE3 #132034 #45556B #7A889B #0D7A6F #0A635A #DDF1EE #FFFFFF #D99A2B` |
| Porcelain | White, indigo, cobalt | `#F8F9FC #EEF1F8 #E1E6F2 #FFFFFF #D8DEEC #1B1F3B #4A5072 #868BA8 #2F49D1 #2338A8 #E4E9FC #FFFFFF #E0A100` |
| Maroon | Warm white, maroon (university) | `#FAF8F7 #F2ECEA #E7DEDB #FFFFFF #E1D5D2 #2A1416 #5B4245 #957D80 #8C1C2B #701623 #F6E3E5 #FFFFFF #C68A2E` |
| Forest | Sage paper, deep green | `#F3F6F2 #E7EDE5 #D9E2D6 #FFFFFF #CFD9CC #1C2A21 #46564B #7C8A80 #2F6B3D #245531 #DDEDE0 #FFFFFF #B9852B` |
| Rose | Blush, berry | `#FBF7F8 #F4ECEF #EADDE2 #FFFFFF #E6D6DC #2B1B22 #5C4650 #98808B #A8325E #88264B #F7E1EA #FFFFFF #2E7D8C` |
| Graphite | Neutral greys, steel blue | `#F6F6F5 #ECECEA #DFDFDC #FFFFFF #D6D6D2 #1F2328 #4B5159 #868B92 #2F5F84 #244B69 #E1EAF2 #FFFFFF #C2763A` |
| Lab at night | Dark slate, teal | `#0F1620 #152030 #1D2B3E #131D2A #263548 #E6EDF5 #A9B6C6 #6E7E92 #3BB8AA #5ACCBF #123B3A #06201E #E8B04A` |
| Indigo night | Deep indigo, periwinkle | `#11131F #181B2B #21253A #161927 #2C3150 #E8E9F3 #B0B3CC #767A99 #8EA2FF #A9B8FF #262D55 #0D1030 #F2C46D` |

A theme is `{ preset, custom? (token overrides), fonts: { heading, body }, radius, baseSize, container }`. `preset: 'custom'` = Signal + overrides. Set `color-scheme` on `<html>` to dark when `--bg-primary` luminance < 0.5.

For a new client with a brand colour: start from the closest preset, replace accent / accent-hover (about 15% darker) / accent-light (accent at ~12% on white) and keep everything else.

### 3.3 Section tones

A section chooses `tone`: `inherit | soft | muted | contrast | accent | custom`. Tones **re-point the variables** for everything inside, so cards, links and buttons stay legible:

```css
.tone-soft  { background: var(--base-bg-secondary); }
.tone-muted { background: var(--base-bg-tertiary); }
.tone-card  { background: var(--base-card-bg); }
.tone-contrast {               /* dark band from the text colour */
  --bg-primary: var(--base-text-primary);
  --card-bg: color-mix(in srgb, var(--base-text-primary) 92%, var(--base-bg-primary));
  --text-primary: var(--base-bg-primary);
  --text-secondary: color-mix(in srgb, var(--base-bg-primary) 78%, var(--base-text-primary));
  --text-muted: color-mix(in srgb, var(--base-bg-primary) 55%, var(--base-text-primary));
  --border: color-mix(in srgb, var(--base-bg-primary) 20%, var(--base-text-primary));
  --accent: color-mix(in srgb, var(--base-accent) 70%, var(--base-bg-primary));
  --accent-hover: var(--base-bg-primary);
  --accent-light: color-mix(in srgb, var(--base-accent) 30%, var(--base-text-primary));
  --accent-contrast: var(--base-text-primary);
  background: var(--bg-primary); color: var(--text-primary);
}
.tone-accent {                 /* solid accent band */
  --bg-primary: var(--base-accent); --text-primary: var(--base-accent-contrast);
  --accent: var(--base-accent-contrast); --accent-contrast: var(--base-accent);
  /* text-secondary / muted / border / accent-light / card via color-mix of contrast and accent */
  background: var(--bg-primary); color: var(--text-primary);
}
```

`custom` tone allows a solid colour, a two-colour gradient with angle, or an image with a dark overlay (0-1), plus an optional text colour and per-section accent.

---

## 4. Typography

- **Heading font** (serif by default): **Newsreader** (opsz 6..72, weights 400/500/600). Alternatives offered: Fraunces, Source Serif 4, Lora, Libre Baskerville, Cormorant Garamond, DM Serif Display, Instrument Sans, Manrope, Space Grotesk, Hind Siliguri, system serif/sans.
- **Body font**: **Instrument Sans** (400-700). Alternatives: Public Sans, IBM Plex Sans, Manrope, Work Sans, Source Serif 4, Lora, Hind Siliguri, system sans.
- Always append a script fallback for the client's language (here `'Noto Sans Bengali'`) between the chosen font and the generic family, and load it in the same Google Fonts request (`&display=swap`).
- Root size `--base-size` 17px (range 14-21); body `line-height: 1.6`; markdown body `1.75`.
- Headings: `font-family: var(--font-heading); letter-spacing: -0.012em;` weight **500** (medium, never bold), `leading-[1.02-1.1]`.
- Scale (mobile → desktop):
  - Hero name: md `2.3→3.2rem`, lg `2.6→4.1rem` (default), xl `3→5rem`, `tracking-[-0.02em]`.
  - Tab header title: `1.75rem` (phone) → `2.3rem` (sm) → `3.4rem` (md).
  - Section title: sm `1.45→1.6rem`, md `1.8→2.25rem` (default), lg `2.1→2.9rem`, xl `2.5→3.7rem`.
  - Eyebrow above a title: `0.92rem`, weight 500, accent colour, sentence case (no all-caps on the public site).
  - Body text in sections `0.95-1.06rem`; captions and dates `0.85rem` muted.
- Max line length for prose: `max-w-[58ch]` to `72ch`.
- Markdown (`.md`): links accent + 1px underline, offset 3px, 2px on hover; list markers accent; blockquote 3px accent left border in heading font at 1.15em; `md-lead` makes the first paragraph 1.2em in text-primary; `md-cols-2` = two text columns from 900px.

---

## 5. Layout, spacing and shape

- Page container `max-w-site` (1180px), side padding `px-5 md:px-8`.
- Section content widths: narrow 780px, normal = container, wide 1400px, full = none.
- Section padding: default 88px top and bottom, applied as `clamp(55% of value, 7vw, value)` so phones get ~48px automatically. Inside the drawer, padding is 60% of that.
- Radius: one `--radius` token (default 14px). Buttons use `calc(var(--radius) * .7)`. Pills and chips are fully rounded (`999px`). Images can be shaped: `arch` (999px 999px r r), `rounded`, `circle` (1:1), `square`.
- Lines: 1px `border-line`. Cards: `outline` (1px border + card bg), `filled` (bg2), `shadow` (`0 1px 2px rgba(0,0,0,.04), 0 10px 30px -14px rgba(0,0,0,.22)`), `plain`.
- Hero photo: 4:5 portrait with an offset outline frame behind it (`translate-x-3 translate-y-3 border border-accent/60`, same shape class).
- Selection colour: accent-light background. Focus: `2px solid var(--accent)`, offset 3px, radius 4px.

### Buttons (public site)

```css
.btn { display:inline-flex; align-items:center; gap:.5rem; padding:.68rem 1.15rem;
  border-radius:calc(var(--radius)*.7); font-weight:600; font-size:.94rem; line-height:1.2;
  border:1px solid transparent; transition:background-color .18s,color .18s,border-color .18s,transform .18s; }
.btn:active { transform: translateY(1px); }
.btn-solid { background:var(--accent); color:var(--accent-contrast); }  .btn-solid:hover { background:var(--accent-hover); }
.btn-outline { border-color:var(--border); color:var(--text-primary); background:color-mix(in srgb,var(--card-bg) 60%,transparent); }
.btn-outline:hover { border-color:var(--accent); color:var(--accent); }
.btn-link { color:var(--accent); font-weight:600; text-decoration:underline; text-decoration-thickness:1px; text-underline-offset:4px; }
```

Every button has an optional lucide icon and one of five **actions**: open a tab in the side panel (`drawer`), go to a tab (`page`), scroll to an anchor, open a URL (new tab), send an email.

Chips/keywords: `rounded-full border border-line bg-card/70 px-3 py-1.5 text-[0.85rem] text-ink2`, hover border+text accent.

---

## 6. Site chrome

### 6.1 Navbar (desktop, ≥1024px)

- Sticky, height `--nav-h` 64px. Transparent-ish `bg-bg/70 backdrop-blur-sm` at the top; after 8px scroll `bg-bg/90 backdrop-blur-md border-b border-line`.
- Left: brand = monogram circle (36px, `border border-line bg-card`, heading font 0.8rem semibold accent letters) + name in heading font 1.12rem.
- Right (or centred, configurable): **pill tabs with icons**:
  - `inline-flex items-center gap-2 rounded-full px-2.5 xl:px-3.5 py-[7px] text-[0.9rem] font-medium`
  - Inactive: `text-ink2 hover:bg-bg2 hover:text-ink`, icon at 75% opacity.
  - Active: `background: var(--accent-light); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 35%, transparent);` text-ink, icon in accent.
  - Icon size 16, stroke 1.8. Each tab stores `navIcon` (name, `'none'`, or empty = automatic). Automatic guesses by id/title: home→Home, about/bio→User, research/lab→FlaskConical, publication/paper→BookOpen, experience/career/cv→Briefcase, award/honour→Award, group/team/student→Users, gallery/photo→Images, contact→Mail, teach/course→GraduationCap, project→Layers, blog/news→PenLine, talk/event→Presentation, else FileText.
- Tabs beyond `nav.maxVisible` (default 7) go into a "More ▾" pill with a rounded-2xl dropdown (chevron rotates 180° when open).
- In edit mode a dashed accent "+ Tab" pill appears at the end.
- Above everything: a **progress bar** (3px, accent, glowing) that starts on any internal link click (`scaleX 0→.92` over 6s ease-out) and completes/fades when the route changes; 8s safety timeout.

### 6.2 Top bar on phones (<1024px)

`[☰ round button] [tab icon + current tab name + "5 ▾" chip]  ……  [monogram]`

- ☰ opens the **menu bottom sheet**.
- The tab name opens **"On this page"**: a bottom sheet listing the tab's titled sections (numbered accent circles, eyebrow above title) plus "Top of the page"; tapping scrolls smoothly to `[data-section=id]`.
- Brand name text is hidden on phones when a monogram exists.

### 6.3 Bottom sheet (phones) - `ui/BottomSheet.js`

- Portal to `document.body` (the sticky navbar has `backdrop-filter`, which traps fixed children).
- Slides up from the bottom; `rounded-t-[22px] border-t border-line bg-bg`, shadow `0 -12px 40px -12px rgba(0,0,0,.35)`, backdrop `#0b1220` at 40%.
- **Default height 50% of the screen** (`dvh`), drag the handle (44×6px pill) or header to resize between ~22% and 94%; released below 22% → closes. Height remembered per sheet in localStorage (`tfs:sheet:<key>`). Handle is a focusable slider: ArrowUp/Down ±6 (Shift ±15).
- Transition `transform, height .3s cubic-bezier(.22,1,.36,1)` (disabled while dragging). Locks body scroll; Escape and backdrop close.
- Menu sheet: big pills `rounded-full px-4 py-3 text-[1.02rem]` with icons; active uses `.nav-pill-active`.

### 6.4 Side panel ("drawer")

The signature interaction: list items, "View all" links and many buttons open content **in a side panel** instead of navigating, keeping context.

- Desktop: slides from the **left or right** (site default in Design; each visitor can swap with a header button, remembered in localStorage). Width default 75vw, resizable by dragging its edge (3px bar, accent on hover) or arrow keys; double-click resets. `transition-transform .3s cubic-bezier(.22,1,.36,1)`; backdrop `#0b1220/40`.
- Phones: the same **bottom sheet** behaviour (50% default, drag to resize/close).
- Header (h-14, h-12 on phones): Back (when stacked) · title · swap side · copy link · open as full page · close.
- Holds a **stack** of views (`{type:'item', id, ids}` or `{type:'page', slug}`) mirrored in the URL (`?view=item:<id>`), so links are shareable and browser Back closes it. Item view has previous/next within its list.

### 6.5 Footer

One quiet row: `© year Honorific Name` + affiliation line (muted) on the left, profile-link icon buttons on the right; `border-t border-line py-6 text-sm`.

### 6.6 Page structure

Each tab = optional **header band** (title + subtitle, align left/center, own tone; compact on phones: `pt-6 pb-6`, subtitle clamped to 3 lines) followed by ordered **sections**.

---

## 7. Sections

Every section has: `{ id, kind, hidden, heading{show, eyebrow, title, subtitle, align, size, style:'top'|'side'}, props{}, style{}, viewAll{show,label,target,mode} }`.

Shared `style` (Design tab of every section): tone, custom background, text colour, accent override, padding top/bottom, content width, min height (svh), content alignment, radius override, font scale, line above/below, **entrance animation**, anchor id, hide on mobile/desktop, extra class, custom CSS. Heading style `side` puts the heading in a sticky left column (`lg:grid-cols-[minmax(220px,1fr)_3fr]`).

| Kind | What it is | Key options |
|---|---|---|
| **hero** | Introduction band filling `height`% of the window (default 80) | photo (shape arch/rounded/circle/square, side, column width 20-50%), eyebrow, name (size md/lg/xl), roles (first one larger, ink; others ink2), markdown bio, buttons, keyword chips, profile links, vertical align, background motif `waveform` (animated SVG line drawing in, 2.4s) / grid / dots / none |
| **collection** | A list from a content collection | layout: **citation** (numbered academic list), **list** (rows + thumbnail), **cards** (grid 1-4 cols), **timeline** (dates on a vertical line), **minimal** (date · title · source in one row), **masonry** (photo wall); selection all/filtered/hand-picked; sort; limit; group by a field; card style; image aspect; density; show images/body (n lines)/tags/link buttons; search box; filter chips by a field; click opens details in the side panel |
| **richtext** | Markdown text with optional image | lead paragraph, 1-2 columns, image left/right/top with caption and shape, a "facts" list (label → value) |
| **blocks** | Free layout | heading, text, image, buttons, quote, list, cards, embed, divider, spacer, html, columns (nested) |
| **stats** | Big numbers | each number fixed or **counted live from a collection** (optionally filtered), suffix, sizes, dividers |
| **contact** | Contact details + form + map | split/stacked; form posts to Firestore `messages` (or localStorage in local mode) |

### Collections (content types)

Collections are user-defined (dashboard → Content → Fields). Each field has a type (`text, textarea, markdown, number, url, image, gallery, tags, select, date, …`) and a **role** that tells every layout what it means: `title, subtitle, meta, date, group, badge, body, image, link, tags, detail` (detail = only shown in the side panel). Layouts read items through roles, so one layout renders publications, experience or awards without knowing their field names.

Typical academic set: Publications (title, authors with the owner's name auto-bolded, venue, details, year, type, badge e.g. "Q1", DOI, link, PDF, abstract, keywords, figure), Research areas, Experience, Education, Awards, Students/Group, Gallery, News.

Clickable list titles: a `role="button"` span whose `::after` covers the whole entry (whole card clickable), with class `fx-open`:

```css
.fx-open { background: linear-gradient(currentColor,currentColor) 0 100% / 0 1.5px no-repeat;
  transition: background-size .32s cubic-bezier(.2,.9,.25,1), color .2s ease; }
.fx-open:hover, .fx-open:focus-visible { color: var(--accent); background-size: 100% 1.5px; }
```

(An accent underline sweeps under the title when anywhere on the entry is hovered.) Link buttons inside entries sit above the overlay with `relative z-10` and stop propagation.

---

## 8. Motion

All motion respects `@media (prefers-reduced-motion: reduce)` (everything shown immediately, no animation).

### 8.1 Page transition

`app/template.js` wraps every route in `<div class="page-enter">` (templates re-mount on navigation):

```css
.page-enter { animation: page-enter .5s cubic-bezier(.22,1,.36,1) backwards; }
@keyframes page-enter {
  from { opacity:0; transform: translateY(14px) scale(.995); filter: blur(6px); }
  60%  { filter: blur(0); }
  to   { opacity:1; transform:none; filter:none; }
}
```

Use `backwards` fill (not `both`) so no transform/filter remains afterwards; otherwise fixed and sticky children break.

### 8.2 Scroll entrances

Per section: `auto` (site default) | `off` | `fade` | `rise` | `genie`; site default in Design → Motion (default **genie**). Treat legacy `none` as `auto`.

Trigger with IntersectionObserver `{ rootMargin: '0px 0px -24px 0px', threshold: 0 }` on the content wrapper. **The waiting state must only be `opacity: 0`** (no transform), or the observer measures a shrunken/shifted box and fires late.

```css
.reveal-fade { opacity:0; transition: opacity .35s ease; }
.reveal-rise { opacity:0; transform: translateY(12px); transition: opacity .35s ease, transform .45s cubic-bezier(.22,1,.36,1); }
.revealed { opacity:1; transform:none; }

/* Genie: pours up out of a point like a macOS dock window. 8-point curved funnel. */
.reveal-genie { opacity: 0; }
.reveal-genie.revealed { opacity:1; transform-origin:50% 100%; animation: genie-in .62s cubic-bezier(.25,.9,.3,1) both; }
@keyframes genie-in {
  0%   { opacity:0; transform: translateY(36px) scale(.9,.55);
         clip-path: polygon(26% 0,74% 0,66% 30%,55% 65%,52% 100%,48% 100%,45% 65%,34% 30%); filter: blur(2px); }
  40%  { opacity:1; transform: translateY(10px) scale(.97,.88);
         clip-path: polygon(4% 0,96% 0,90% 30%,72% 65%,62% 100%,38% 100%,28% 65%,10% 30%); filter: blur(0); }
  100% { opacity:1; transform:none;
         clip-path: polygon(-20% -20%,120% -20%,120% 30%,120% 65%,120% 120%,-20% 120%,-20% 65%,-20% 30%); filter:none; }
}
.reveal-settled.reveal-genie { animation:none; opacity:1; } /* added ~700ms after reveal so nothing is clipped */
```

Entrances are disabled inside the editor and inside the drawer.

### 8.3 Pointer styles (mouse/trackpad only) - `layout/CursorFx.js`

Chosen in Design → Pointer (`config.effects.cursorStyle`), default **comet**:

| Style | Behaviour |
|---|---|
| **comet** | Accent arrow (swept arrowhead with notched tail, tip at 2,2, white/bg outline 1.6px, inner shine at 35% white, small drop shadow) + canvas tail: points kept 260ms, segment width 7px × life, alpha 0.55 × life², radial glow (14px) at the head. |
| **arrow** | The arrow without a tail. |
| **ring** | 6px accent dot + 34px ring (1.5px accent border at 70%) that eases after the pointer and **wraps clickables** (element rect + 6px padding, element's radius + 6, tinted 10%); large clickables (>340×140) get a 64px filled disc. |
| **sparkle** | Arrow + four-point star particles (accent, 30% white) emitted while moving and a 14-particle burst on click; gravity 0.07, life 650ms. |
| **glow** | System pointer kept + a soft accent spotlight (radius 130px, 16% → 70px, 30% over clickables) easing after it. |
| **none** | System pointer. |

Shared rules:
- Over clickables the arrow rotates −14° and scales 1.18 with an accent drop-shadow glow; on press scale .86.
- **Magnetic lean**: small clickables move toward the pointer by 18% of the offset, max 7px, using the CSS `translate` property (not `transform`, so existing transforms survive) with `transition: translate .35s`. Compensate for the lean when measuring the rect, or it oscillates. Inline elements cannot be translated (fine).
- **Action labels** beside the pointer (accent pill, 11.5px semibold) for clickable *text*: "Open details", "Visit ↗" (external), "Email", "Call", "Download" (pdf/doc), "Jump" (#anchor), "Open" (internal link or big card). No label for real buttons, chips, or anything in header/nav. `data-cursor-label` overrides.
- System pointer hidden only for styles that draw one, and never over inputs, textareas, contenteditable, resize handles, or admin UI (`.ui`).
- Disabled on touch devices, reduced motion, the dashboard and login page. Exception: a `[data-cursor-preview][data-cursor-style=…]` box (used in the picker) runs that style even on the dashboard.
- Appear instantly (`transition-duration:0s` on show), fade only on hide, so there is never a moment with no pointer.

---

## 9. Editing model

### 9.1 In place on the site

- Signed-in editors see a floating **editor bar** (dark slate pill, bottom-centre): Edit page / Editing toggle (amber when on), page quick actions (add section, tab settings), Dashboard, save status dot (green live, amber local/slow, red offline, spinner while saving), "⋯" menu (dashboard tabs, add tab, download backup, collapse, reset position), sign out. **Draggable** by a grip (position remembered, clamped to screen, arrow keys nudge, double-click resets), collapsible to a mini pill. Shortcuts Alt+E (edit mode), Alt+B (collapse). Hidden on the dashboard.
- In edit mode each section shows a toolbar (edit, move up/down, duplicate, hide, delete), "Add section here" insert points between sections, and a sticky "Tab settings" chip. Section editing happens in the **Section Studio** (split-screen live preview): the tools dock full-height on the left (swap to right; drag the inner edge to resize, 360px-60vw, default 440; remembered) and the site shifts over (`html.studio-open body { padding-left: var(--studio-w) }`) so the edited section stays visible and updates as you type; phones dock the tools at the bottom (55% sheet) with the page above. The edited section is scrolled into view and framed with a dashed jade outline and an "Editing" tag. Panel: header (kind icon, kind label, section title, tab name; Find it, swap side, close), a "Find a setting" search across all tabs, icon tabs Content / Heading / Design / Advanced with a one-line description, settings as collapsible cards per field group, footer with live status, Undo changes, Cancel, Save (Ctrl+S; Esc closes with a confirm if dirty). The floating editor bar hides while the Studio is open. Forms are generated from declarations in `lib/sections.js` (fields with `key` paths, `type`, `when(section)` conditions, help text, `{ group }` markers that become the cards).

### 9.2 Admin UI visual language (different from the site on purpose)

Admin tools use a **fixed neutral palette** so they stay readable on any theme: wrapper class `.ui` (system sans 14px, slate-900 text), `.ui-input` (1px #cbd5e1, radius 8, focus ring jade `#0d7a6f`), `.ui-btn`, `.ui-btn-accent` (jade), `.ui-btn-primary` (slate-900), `.ui-btn-danger`, `.ui-icon-btn` (30px), `.ui-seg` (segmented control, pressed = white with shadow), `.ui-card` (1px #e2e8f0, radius 12), `.ui-label` 12px semibold, `.ui-help` 11.5px slate-500, `.ui-group` (11px bold jade section separators).

Modals: centred on desktop, **bottom-anchored on phones** (`items-end sm:items-center`, `rounded-t-2xl`), max-h 92vh, sticky footer for actions. Keep a module-level stack so **Escape closes only the top modal**. Render nested dialogs through a portal.

### 9.3 Dashboard (`/admin`) - full-screen app

- No public navbar/footer/editor bar on this route.
- **Left sidebar**, slate-900, 256px wide or 68px icons-only (toggle at the bottom, remembered). Header: green "D" tile + "Dashboard" + signed-in email. Groups with tiny uppercase labels:
  - Overview
  - **Website**: Tabs (pages) · Content (when active, lists every collection with counts as a sub-menu)
  - **Appearance**: Design
  - **Inbox**: Messages (green unread badge)
  - **Settings**: Data and backups
  - Bottom: green **Edit the site** button, View site, saving status, Sign out, collapse.
  - Active item: `bg-white/10` + 3px emerald bar on the left.
- **Top bar** (sticky, white/90 blur): breadcrumb "Dashboard / Group", section icon + title, actions, **How this works** button; under it a one-line summary of what the section is for. The guide (numbered steps on an emerald-50 strip) opens automatically on the first visit to each section.
- Phones: sidebar becomes a slide-out (☰), plus a **bottom tab bar** (Overview, Content, Tabs, Design, More with unread dot), a green pencil "Edit the site" button in the top bar, content padded `pb-28`.
- **Overview**: 4 clickable stat cards (tabs + hidden count, content entries, unread messages, saving mode); quick actions grid (Edit the site [accent], Add <entry>, Add a tab, Manage content, Change the look, Download a backup); **Getting started** checklist with a progress bar that ticks itself from real data (name/title, photo, contact + links, first content, online saving, image host, backup in the last 30 days); "Two ways to edit" explainer.
- **Tabs**: ordered list with up/down, "Menu" checkbox, eye (public/hidden), Settings, Open.
- **Content**: per collection list with search, Fields (schema editor), Add; rows with move up/down, eye, edit, duplicate, delete.
- **Design**: jump bar to cards (Theme, Typography and shape, Navigation and side panel, Motion, Pointer, Site details, Contact information, Profile links, Footer). Theme changes **preview live on the page** and only publish on **Save design**; sticky Undo / Save bar.
- **Pointer** card: six illustrated tiles + a "Try it here" box (sample button, text link, large card) running the selected style before saving.
- **Messages**: inbox with unread highlight, reply by email, mark read, delete.
- **Data and backups**: storage mode, download backup (JSON), restore, push local content to Firebase.
- Section URLs: `/admin?tab=content&list=publications` (Back button works).

### 9.4 Hover help - `ui/TooltipLayer.js`

One delegated listener (mounted once) shows a dark tooltip (`bg-slate-900 text-white text-[12px] rounded-lg max-w-[260px]`, arrow, 380ms delay, instant when moving between tips, flips below near the top, clamped to the screen) for:
- any element with `data-tip="Title|Longer explanation"` (title bold, explanation slate-300), anywhere;
- inside `.ui`: any `title` attribute (moved to `data-tip-title`, kept for screen readers as `aria-description`) and icon-only buttons with an `aria-label`.

Also on keyboard focus (`:focus-visible`); hides on pointerdown, scroll, Escape. Write a `data-tip` with a consequence for every non-obvious control (e.g. eye: "Visible|Click to hide this entry from visitors without deleting it.").

---

## 10. Images - drop, crop, compress

Every image field is a **drop zone**: drag a file or an image link in, tap to choose (phones offer camera/gallery via `accept="image/*"`), or paste a screenshot (Ctrl+V). Existing images show Crop / Replace / Remove over the preview; a link input is tucked under "Use an image link instead". Gallery fields accept many files at once (each optimised with defaults).

Crop dialog (`ImageEditorDialog`): free-drag crop frame with corner handles, rule-of-thirds lines and a dimmed outside (`box-shadow: 0 0 0 9999px rgba(15,23,42,.62)`), arrow keys nudge; aspect presets Free / Original / 1:1 / 4:5 / 3:4 / 4:3 / 3:2 / 16:9; rotate ±90°, mirror, reset; output size (Small 800, Medium 1200, **Large 1600**, Extra large 2400, Original; never upscale); format Best (WebP, PNG if transparent) / WebP / JPG / PNG; quality slider (default 88). The real output file is produced in the background 450ms after the last change and shown as "1600 × 1200 · WEBP · 186 KB −96%", so "Use image" is instant.

Pipeline (`lib/imagePipeline.js` + `lib/imageResize.js` in a Web Worker):
1. Decode with `createImageBitmap(blob, { imageOrientation: 'from-image' })` (EXIF-correct), fallback `<img>.decode()`.
2. Draw the crop (with rotation/flip) at full resolution, capped at 16 MP (iOS canvas limit).
3. Exact 2:1 canvas halvings (`imageSmoothingQuality: 'high'`) until less than 2× the target.
4. Final **Lanczos-3** resample, separable, in **linear light with premultiplied alpha** (sRGB→linear LUT in, 65536-step linear→sRGB LUT out), then a light 3×3 unsharp mask (amount 0.3) when downscaling. Fall back to the main thread if the worker fails.
5. Encode; detect unsupported WebP (browser returns PNG) and fall back to JPEG. With a byte budget, binary-search quality between 0.5 and the chosen quality (7 steps); if still too large, shrink dimensions by 18% and retry.
6. Store: Cloudinary unsigned upload (with progress) when configured; otherwise an inline data URL with a **220 KB budget** (Firestore documents max 1 MB). GIF and SVG are stored untouched.

Display through `SafeImage`: lazy, async decode, `referrerPolicy="no-referrer"`, Cloudinary URLs get `w_<width>,f_auto,q_auto`, and failures swap to a placeholder with the subject's initials in the heading font.

---

## 11. Data layer

- **Three layers**: SEED (bundled `data/seed.js`, renders on the server and first paint) → CACHE (localStorage `tfs:data:v1`, applied immediately) → LIVE (Firestore snapshots, written back to cache). A tiny external store with `useSyncExternalStore` hooks: `useConfig, useSchema, usePages, usePage, useItemsMap, useCollectionItems, useStatus`.
- **Modes**: `live` (Firebase configured) or `local` (no Firebase, or forced from Data panel; edits saved in the browser, exportable and pushable later). Status: source, connected, slow (>8s), error, pending writes (10s write timeout → queued).
- Firestore layout: `site/config` (theme, nav, footer, contact, socials, drawer, effects), `site/schema` (collections), `pages/{slug}` (tab + ordered sections), `items/{id}` (every content item with `collection`), `messages/{id}`.
- Remote config is deep-merged over the seed so new settings get defaults automatically.
- Auth: Firebase email/password, optional allow-list `NEXT_PUBLIC_ADMIN_EMAILS`; local mode offers a "local editor" session.
- Tabs pre-rendered with `generateStaticParams` from the seed (`dynamicParams = true` for tabs added later) so links prefetch and tab switches are instant.

Env vars: `NEXT_PUBLIC_FIREBASE_API_KEY, _AUTH_DOMAIN, _PROJECT_ID, _STORAGE_BUCKET, _APP_ID, NEXT_PUBLIC_ADMIN_EMAILS, NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`.

Config shape (seed defaults):

```js
config = {
  site: { title, description, language: 'en' },
  brand: { name, mark: 'TFS', showMark: true },
  person: { honorific, name, position, affiliation, citeAs, photo },
  contact: { email, phone, address, office, hours, mapUrl },
  socials: [{ label, url, icon }],
  theme: { preset: 'signal', fonts: { heading: 'Newsreader', body: 'Instrument Sans' }, radius: 14, baseSize: 17, container: 1180 },
  nav: { maxVisible: 7, sticky: true, align: 'right' },
  footer: { line, note, showSocials: true },
  drawer: { side: 'left', width: 75, itemClick: 'drawer' },
  effects: { cursor: true, cursorStyle: 'comet', scroll: 'genie' },
}
```

---

## 12. Accessibility checklist

- Skip link to `#main`; landmarks (`header`, `nav aria-label`, `main`, `footer`); one `h1` per page.
- Every icon-only button has `aria-label`; toggles use `aria-pressed`/`aria-expanded`; current tab `aria-current="page"`.
- Visible focus everywhere (`:focus-visible` accent ring); drawer/sheets/modals move focus in and restore it; Escape closes the top layer only.
- Clickable spans: `role="button"`, `tabIndex=0`, Enter/Space handlers.
- Resizable panels expose `role="separator"`/`"slider"` with `aria-value*` and arrow-key control.
- Respect reduced motion; tooltips also on keyboard focus; colour contrast checked for every preset and tone.

---

## 13. Mobile rules

- Breakpoints: phone < 640 (sm), tablet 640-1023, desktop ≥ 1024 (lg) for navigation, ≥ 768 (md) for the drawer.
- Phones: top bar with ☰ + current tab; menu, "On this page" and the detail drawer are **bottom sheets at 50%** with drag-to-resize; compact tab headers; section padding scales with `clamp`; hero photo max 230-280px wide above the text; hide-on-mobile/desktop per section.
- Tap targets ≥ 40px; inputs ≥ 16px font to avoid iOS zoom; respect `env(safe-area-inset-bottom)` on sheets and bottom bars.
- No custom pointer effects on touch.

---

## 14. Build order for a new site

1. Scaffold Next.js 14 + Tailwind; add `globals.css` tokens/tones/buttons/markdown/motion/admin classes and the Tailwind mapping (sections 3-5).
2. `lib/themes.js` (presets, fonts, `themeVars`, `fontsHref`) and `app/layout.js` writing the seed theme inline on `<html>` plus the fonts link.
3. `data/seed.js` with the client's real content: config, collections schema (with roles), pages and sections, items.
4. Store + Boot (theme applied from live config, fonts swapped) + Providers.
5. Navbar (pills, icons, More, progress bar), mobile top bar + BottomSheet, Footer, template page-enter.
6. PageView + SectionFrame (tones, widths, padding clamp, reveal) + the six section kinds + collection layouts.
7. Drawer + DrawerContext (stack, URL sync, side/bottom sheet).
8. Admin: AdminContext, login, editor bar, section/item/page editors (form renderer from declarations), image pipeline, dashboard shell, overview, panels, tooltip layer.
9. CursorFx + Design panel (Theme, Typography, Navigation, Motion, Pointer…).
10. Verify (section 16).

Adapting to a different kind of client (doctor, lawyer, designer, small business): keep everything above; change only seed content, collection types (e.g. Services, Treatments, Case studies, Testimonials, Clinics/Branches, FAQ), nav icon guesses, default preset and fonts (e.g. Porcelain + Manrope/Manrope for a clinic, Graphite + Space Grotesk for a tech consultant), and the hero motif.

---

## 15. Pitfalls already learned (do not repeat)

- **Never run `next build` while `next dev` is running in the same folder** - both use `.next`; the dev server breaks with `Cannot read properties of undefined (reading 'call')`. Build a copy in a scratch folder (junction `node_modules`, remove the junction with `rmdir`, not recursive delete), or stop the dev server and delete `.next` first.
- A CSS custom property that references itself (`--hi: var(--hi)`) is invalid and silently resolves to nothing.
- `backdrop-filter`, `transform` and `filter` on an ancestor make it the containing block for `position: fixed` children: portal sheets, modals and tooltips to `document.body`.
- Leave no transform/filter/clip after animations (`backwards` fill, "settled" class); they clip shadows and break sticky/fixed children.
- IntersectionObserver measures transformed boxes: hide reveal targets with opacity only.
- Measuring a leaning (translated) element must subtract the current lean.
- Tailwind opacity modifiers do not work on `var()` colours.
- Nested modals: Escape must close only the top one (module-level stack).
- Data URLs in Firestore: keep each image small; a page document holding many inline images can exceed 1 MB. Recommend Cloudinary for galleries.
- Dynamic `[slug]` routes without `generateStaticParams` cannot be prefetched, so tab switches feel slow.
- Dev-mode route compilation makes the first visit to each tab slow; judge speed with `next build && next start`.

---

## 16. Verification before handing over

- `next build` passes (in a scratch copy if a dev server is running).
- Every preset and tone readable (text, links, buttons, cards) in light and dark presets.
- Phone (375px), tablet (768px), desktop (1280px+): navbar/top bar, sheets drag and close, drawer both sides, hero layout, tab headers compact, no horizontal scroll.
- Reduced motion: no animations, pointer effects off.
- Local mode works with no env vars; live mode signs in, saves, and survives a refresh; backup download/restore round-trips.
- Image drop → crop → saved size shown; GIF/SVG pass through; remote image "Crop" handles CORS failure with a clear message.
- Dashboard: sidebar collapse, phone bottom bar, every icon button shows a tooltip, guides open on first visit, Design preview + Save/Undo, pointer "Try it here".
- Report what was verified and what was not (e.g. not tried on a real phone) honestly.
