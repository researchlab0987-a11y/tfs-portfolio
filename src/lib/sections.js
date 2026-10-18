/**
 * SECTION REGISTRY
 * src/lib/sections.js
 *
 * Every section on every page is a plain object:
 *
 *   { id, kind, hidden, heading{}, props{}, style{}, viewAll{} }
 *
 * This file declares, for each kind, its defaults and the form fields that
 * edit it. The editor panel is generated from these declarations, so adding a
 * new option is one line here and nothing else.
 *
 * Field descriptor:
 *   { key: 'props.name', label, type, options, help, when(section), min, max, step,
 *     fields (for list types), group }
 */
import { clone, deepMerge, uid } from './utils';

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

export const DEFAULT_HEADING = {
  show: true,
  eyebrow: '',
  title: '',
  subtitle: '',
  align: 'left',
  size: 'md',
  style: 'plain', // plain | rule | side
};

export const DEFAULT_VIEWALL = { show: false, label: 'View all', target: '', mode: 'drawer' };

export const DEFAULT_STYLE = {
  tone: 'inherit', // inherit | soft | muted | contrast | accent | custom
  bgType: 'color', // color | gradient | image (when tone = custom)
  bgColor: '',
  bgColor2: '',
  bgAngle: 135,
  bgImage: '',
  overlay: 0.45,
  textColor: '',
  accentColor: '',
  paddingTop: 88,
  paddingBottom: 88,
  width: 'normal', // narrow | normal | wide | full
  minHeight: 0,
  contentAlign: 'left',
  radius: '',
  fontScale: 1,
  borderTop: false,
  borderBottom: false,
  animation: 'auto', // auto (site setting) | off | fade | rise | genie
  anchor: '',
  hideMobile: false,
  hideDesktop: false,
  className: '',
  customCss: '',
};

export const ACTIONS = [
  { value: 'drawer', label: 'Open a tab in the side panel' },
  { value: 'page', label: 'Go to a tab' },
  { value: 'scroll', label: 'Scroll to a section (anchor)' },
  { value: 'url', label: 'Open a web link' },
  { value: 'email', label: 'Send an email' },
];

export const ICON_CHOICES = [
  '', 'User', 'Radar', 'Mail', 'BookOpen', 'Award', 'Briefcase', 'GraduationCap', 'FlaskConical',
  'Linkedin', 'Github', 'Globe', 'FileText', 'Download', 'Phone', 'MapPin', 'Calendar', 'Star',
  'Sparkles', 'Lightbulb', 'Cpu', 'Wifi', 'HeartPulse', 'Building2', 'Users', 'Newspaper', 'Images',
  'Landmark', 'Handshake', 'ExternalLink', 'ArrowRight', 'Check', 'Quote', 'Mic', 'Video', 'Youtube',
  'Twitter', 'Facebook', 'Rss', 'Link', 'Home', 'Layers', 'PenLine', 'Microscope', 'Trophy', 'Presentation',
  'School', 'UsersRound', 'Folder',
];

const BUTTON_FIELDS = [
  { key: 'label', label: 'Text', type: 'text' },
  { key: 'action', label: 'When clicked', type: 'select', options: ACTIONS },
  { key: 'target', label: 'Target', type: 'action-target', help: 'A tab, an anchor id, a web address or an email.' },
  { key: 'style', label: 'Style', type: 'segmented', options: ['solid', 'outline', 'link'] },
  { key: 'icon', label: 'Icon', type: 'icon' },
];

export const DISPLAY_MODES = [
  { value: 'citation', label: 'Citation list', hint: 'Numbered, academic style. Best for publications.' },
  { value: 'list', label: 'List', hint: 'One item per row with an optional thumbnail.' },
  { value: 'cards', label: 'Cards', hint: 'A responsive grid of cards.' },
  { value: 'timeline', label: 'Timeline', hint: 'Dates on a vertical line. For careers and degrees.' },
  { value: 'minimal', label: 'Compact rows', hint: 'Date, title and source on one line.' },
  { value: 'masonry', label: 'Photo wall', hint: 'Images of varying height.' },
];

/* ------------------------------------------------------------------ */
/* Kinds                                                               */
/* ------------------------------------------------------------------ */

export const KINDS = {
  hero: {
    label: 'Introduction (hero)',
    icon: 'User',
    description: 'Photo, name, titles, short bio and buttons.',
    hasHeading: false,
    defaults: () => ({
      props: {
        eyebrow: '',
        name: 'Your name',
        roles: 'Your position',
        bio: '',
        image: '',
        imageAlt: '',
        imageShape: 'arch',
        imageSide: 'left',
        imageWidth: 33,
        height: 80,
        verticalAlign: 'center',
        buttons: [],
        keywords: '',
        showKeywords: true,
        showSocials: true,
        decoration: 'waveform',
        nameSize: 'lg',
      },
      style: { paddingTop: 40, paddingBottom: 24, width: 'normal' },
    }),
    fields: [
      { group: 'Text' },
      { key: 'props.eyebrow', label: 'Small line above the name', type: 'text' },
      { key: 'props.name', label: 'Name', type: 'text' },
      { key: 'props.nameSize', label: 'Name size', type: 'segmented', options: ['md', 'lg', 'xl'] },
      { key: 'props.roles', label: 'Titles (one per line)', type: 'textarea', rows: 3 },
      { key: 'props.bio', label: 'Short introduction', type: 'markdown', rows: 4 },
      { key: 'props.keywords', label: 'Keywords (comma separated)', type: 'textarea', rows: 2 },
      { key: 'props.showKeywords', label: 'Show keywords', type: 'toggle' },
      { key: 'props.showSocials', label: 'Show profile links', type: 'toggle', help: 'Edit the links in Admin, Design, Site details.' },
      { group: 'Buttons' },
      { key: 'props.buttons', label: 'Buttons', type: 'list', fields: BUTTON_FIELDS, itemLabel: (b) => b.label || 'Button', addLabel: 'Add button', newItem: () => ({ label: 'New button', action: 'drawer', target: 'about', style: 'outline', icon: '' }) },
      { group: 'Photo' },
      { key: 'props.image', label: 'Photo', type: 'image' },
      { key: 'props.imageAlt', label: 'Photo description', type: 'text' },
      { key: 'props.imageShape', label: 'Shape', type: 'segmented', options: ['arch', 'rounded', 'circle', 'square'] },
      { key: 'props.imageSide', label: 'Side', type: 'segmented', options: ['left', 'right'] },
      { key: 'props.imageWidth', label: 'Photo column width (%)', type: 'range', min: 20, max: 50, step: 1 },
      { group: 'Layout' },
      { key: 'props.height', label: 'Height (% of window)', type: 'range', min: 40, max: 100, step: 5 },
      { key: 'props.verticalAlign', label: 'Vertical alignment', type: 'segmented', options: ['start', 'center', 'end'] },
      { key: 'props.decoration', label: 'Background motif', type: 'segmented', options: ['waveform', 'grid', 'dots', 'none'] },
    ],
  },

  collection: {
    label: 'Content list',
    icon: 'LayoutList',
    description: 'Publications, awards, experience or any collection, in a layout you choose.',
    hasHeading: true,
    defaults: () => ({
      props: {
        collection: 'publications',
        selection: 'all', // all | filter | manual
        filterField: '',
        filterValue: '',
        ids: [],
        sortField: '',
        sortDir: 'asc',
        limit: 0,
        groupBy: '',
        mode: 'list',
        columns: 3,
        numbered: true,
        showImages: true,
        imageAspect: '4/3',
        showBody: true,
        bodyLines: 2,
        showTags: true,
        showLinks: true,
        hiddenFields: [],
        cardStyle: 'outline', // outline | filled | shadow | plain
        density: 'comfortable',
        showSearch: false,
        chipsField: '',
        clickable: true,
        emptyText: 'Nothing here yet.',
      },
    }),
    fields: [
      { group: 'What to show' },
      { key: 'props.collection', label: 'Collection', type: 'collection' },
      { key: 'props.selection', label: 'Items', type: 'segmented', options: [{ value: 'all', label: 'All' }, { value: 'filter', label: 'Filtered' }, { value: 'manual', label: 'Hand-picked' }] },
      { key: 'props.filterField', label: 'Filter field', type: 'field', when: (s) => s.props.selection === 'filter' },
      { key: 'props.filterValue', label: 'Equals', type: 'field-value', fieldPath: 'props.filterField', when: (s) => s.props.selection === 'filter' },
      { key: 'props.ids', label: 'Pick and order items', type: 'items', when: (s) => s.props.selection === 'manual' },
      { key: 'props.sortField', label: 'Sort by', type: 'field', allowOrder: true, when: (s) => s.props.selection !== 'manual' },
      { key: 'props.sortDir', label: 'Direction', type: 'segmented', options: [{ value: 'asc', label: 'Ascending' }, { value: 'desc', label: 'Descending' }], when: (s) => s.props.selection !== 'manual' },
      { key: 'props.limit', label: 'How many (0 = all)', type: 'number', min: 0, max: 500 },
      { key: 'props.groupBy', label: 'Group under headings by', type: 'field', allowNone: true },
      { group: 'Layout' },
      { key: 'props.mode', label: 'Layout', type: 'mode' },
      { key: 'props.columns', label: 'Columns', type: 'segmented', options: [1, 2, 3, 4], when: (s) => ['cards', 'masonry', 'list'].includes(s.props.mode) },
      { key: 'props.cardStyle', label: 'Card style', type: 'segmented', options: ['outline', 'filled', 'shadow', 'plain'], when: (s) => ['cards', 'list'].includes(s.props.mode) },
      { key: 'props.imageAspect', label: 'Image shape', type: 'segmented', options: ['16/9', '4/3', '1/1', '3/4'], when: (s) => ['cards', 'list'].includes(s.props.mode) },
      { key: 'props.density', label: 'Spacing', type: 'segmented', options: ['compact', 'comfortable', 'airy'] },
      { key: 'props.numbered', label: 'Number the entries', type: 'toggle', when: (s) => s.props.mode === 'citation' },
      { group: 'Fields' },
      { key: 'props.showImages', label: 'Show images', type: 'toggle' },
      { key: 'props.showBody', label: 'Show description', type: 'toggle' },
      { key: 'props.bodyLines', label: 'Description lines (0 = full)', type: 'number', min: 0, max: 20, when: (s) => s.props.showBody },
      { key: 'props.showTags', label: 'Show tags', type: 'toggle' },
      { key: 'props.showLinks', label: 'Show link buttons', type: 'toggle' },
      { key: 'props.hiddenFields', label: 'Hide these fields', type: 'field-multi' },
      { group: 'Interaction' },
      { key: 'props.clickable', label: 'Open details in the side panel on click', type: 'toggle' },
      { key: 'props.showSearch', label: 'Search box', type: 'toggle' },
      { key: 'props.chipsField', label: 'Filter buttons by', type: 'field', allowNone: true },
      { key: 'props.emptyText', label: 'Text when empty', type: 'text' },
    ],
  },

  richtext: {
    label: 'Text and image',
    icon: 'AlignLeft',
    description: 'Formatted text with an optional photo and a list of key facts.',
    hasHeading: true,
    defaults: () => ({
      props: {
        body: 'Write here. **Bold**, _italic_, [links](https://example.com) and lists all work.',
        lead: false,
        columns: 1,
        image: '',
        imageAlt: '',
        imageSide: 'none',
        imageWidth: 38,
        imageShape: 'rounded',
        imageCaption: '',
        factsTitle: '',
        facts: [],
      },
    }),
    fields: [
      { group: 'Text' },
      { key: 'props.body', label: 'Text', type: 'markdown', rows: 10 },
      { key: 'props.lead', label: 'Larger first paragraph', type: 'toggle' },
      { key: 'props.columns', label: 'Text columns', type: 'segmented', options: [1, 2] },
      { group: 'Image' },
      { key: 'props.imageSide', label: 'Image position', type: 'segmented', options: ['none', 'left', 'right', 'top'] },
      { key: 'props.image', label: 'Image', type: 'image', when: (s) => s.props.imageSide !== 'none' },
      { key: 'props.imageAlt', label: 'Image description', type: 'text', when: (s) => s.props.imageSide !== 'none' },
      { key: 'props.imageCaption', label: 'Caption', type: 'text', when: (s) => s.props.imageSide !== 'none' },
      { key: 'props.imageShape', label: 'Shape', type: 'segmented', options: ['arch', 'rounded', 'circle', 'square'], when: (s) => s.props.imageSide !== 'none' },
      { key: 'props.imageWidth', label: 'Image width (%)', type: 'range', min: 20, max: 60, when: (s) => ['left', 'right'].includes(s.props.imageSide) },
      { group: 'Key facts' },
      { key: 'props.factsTitle', label: 'Facts heading', type: 'text' },
      { key: 'props.facts', label: 'Facts', type: 'list', fields: [{ key: 'label', label: 'Label', type: 'text' }, { key: 'value', label: 'Value (markdown)', type: 'text' }], itemLabel: (f) => f.label || 'Fact', addLabel: 'Add fact', newItem: () => ({ label: 'Label', value: 'Value' }) },
    ],
  },

  blocks: {
    label: 'Free layout',
    icon: 'LayoutTemplate',
    description: 'Build it yourself from headings, text, images, buttons, columns, cards and embeds.',
    hasHeading: true,
    defaults: () => ({ props: { blocks: [], gap: 'md' } }),
    fields: [
      { key: 'props.gap', label: 'Space between blocks', type: 'segmented', options: ['sm', 'md', 'lg'] },
      { key: 'props.blocks', label: 'Blocks', type: 'blocks' },
    ],
  },

  stats: {
    label: 'Numbers',
    icon: 'BarChart3',
    description: 'Large figures such as publication counts, live from your collections.',
    hasHeading: true,
    defaults: () => ({ props: { items: [], align: 'left', size: 'lg', dividers: true } }),
    fields: [
      { key: 'props.align', label: 'Alignment', type: 'segmented', options: ['left', 'center'] },
      { key: 'props.size', label: 'Number size', type: 'segmented', options: ['md', 'lg', 'xl'] },
      { key: 'props.dividers', label: 'Dividers between numbers', type: 'toggle' },
      {
        key: 'props.items',
        label: 'Numbers',
        type: 'list',
        itemLabel: (s) => s.label || 'Number',
        addLabel: 'Add number',
        newItem: () => ({ label: 'Label', value: '10', suffix: '+', source: '' }),
        fields: [
          { key: 'label', label: 'Label', type: 'text' },
          { key: 'source', label: 'Count items from', type: 'collection', allowNone: true, help: 'Leave empty to type a fixed number.' },
          { key: 'filterField', label: 'Only where field', type: 'text', help: 'Optional field key, e.g. type' },
          { key: 'filterValue', label: 'equals', type: 'text' },
          { key: 'value', label: 'Fixed number', type: 'text' },
          { key: 'suffix', label: 'Suffix', type: 'text' },
        ],
      },
    ],
  },

  contact: {
    label: 'Contact',
    icon: 'Mail',
    description: 'Address, email, a message form and a map.',
    hasHeading: true,
    defaults: () => ({
      props: {
        intro: '',
        showDetails: true,
        showForm: true,
        showMap: true,
        mapUrl: '',
        formTitle: 'Send a message',
        successText: 'Thank you. Your message has been sent.',
        layout: 'split',
      },
    }),
    fields: [
      { key: 'props.intro', label: 'Introduction', type: 'markdown', rows: 3 },
      { key: 'props.layout', label: 'Layout', type: 'segmented', options: ['split', 'stacked'] },
      { key: 'props.showDetails', label: 'Show address and email', type: 'toggle', help: 'Edit them in Admin, Design, Site details.' },
      { key: 'props.showForm', label: 'Show message form', type: 'toggle' },
      { key: 'props.formTitle', label: 'Form title', type: 'text', when: (s) => s.props.showForm },
      { key: 'props.successText', label: 'Message after sending', type: 'text', when: (s) => s.props.showForm },
      { key: 'props.showMap', label: 'Show map', type: 'toggle' },
      { key: 'props.mapUrl', label: 'Map embed link (optional)', type: 'text', help: 'Google Maps, Share, Embed a map, copy the src link. Empty uses the site default.', when: (s) => s.props.showMap },
    ],
  },
};

export const KIND_KEYS = Object.keys(KINDS);

/* ------------------------------------------------------------------ */
/* Design (shared by every kind)                                       */
/* ------------------------------------------------------------------ */

export const HEADING_FIELDS = [
  { key: 'heading.show', label: 'Show heading', type: 'toggle' },
  { key: 'heading.eyebrow', label: 'Small line above', type: 'text', when: (s) => s.heading.show },
  { key: 'heading.title', label: 'Title', type: 'text', when: (s) => s.heading.show },
  { key: 'heading.subtitle', label: 'Subtitle', type: 'textarea', rows: 2, when: (s) => s.heading.show },
  { key: 'heading.align', label: 'Alignment', type: 'segmented', options: ['left', 'center', 'right'], when: (s) => s.heading.show },
  { key: 'heading.size', label: 'Size', type: 'segmented', options: ['sm', 'md', 'lg', 'xl'], when: (s) => s.heading.show },
  { key: 'heading.style', label: 'Style', type: 'segmented', options: [{ value: 'plain', label: 'Plain' }, { value: 'rule', label: 'Underline' }, { value: 'side', label: 'Side' }], when: (s) => s.heading.show, help: '“Side” puts the heading in a column beside the content on wide screens.' },
  { group: 'Link below the section' },
  { key: 'viewAll.show', label: 'Show a “view all” link', type: 'toggle' },
  { key: 'viewAll.label', label: 'Link text', type: 'text', when: (s) => s.viewAll.show },
  { key: 'viewAll.target', label: 'Tab', type: 'page', when: (s) => s.viewAll.show },
  { key: 'viewAll.mode', label: 'Opens', type: 'segmented', options: [{ value: 'drawer', label: 'In side panel' }, { value: 'page', label: 'As a page' }], when: (s) => s.viewAll.show },
];

export const STYLE_FIELDS = [
  { group: 'Colours' },
  {
    key: 'style.tone',
    label: 'Background',
    type: 'select',
    options: [
      { value: 'inherit', label: 'Page background' },
      { value: 'soft', label: 'Soft band' },
      { value: 'muted', label: 'Deeper band' },
      { value: 'card', label: 'Card colour' },
      { value: 'contrast', label: 'Inverted (dark on light themes)' },
      { value: 'accent', label: 'Accent colour' },
      { value: 'custom', label: 'Custom…' },
    ],
  },
  { key: 'style.bgType', label: 'Custom background', type: 'segmented', options: ['color', 'gradient', 'image'], when: (s) => s.style.tone === 'custom' },
  { key: 'style.bgColor', label: 'Colour', type: 'color', when: (s) => s.style.tone === 'custom' && s.style.bgType !== 'image' },
  { key: 'style.bgColor2', label: 'Second colour', type: 'color', when: (s) => s.style.tone === 'custom' && s.style.bgType === 'gradient' },
  { key: 'style.bgAngle', label: 'Gradient angle', type: 'range', min: 0, max: 360, step: 5, when: (s) => s.style.tone === 'custom' && s.style.bgType === 'gradient' },
  { key: 'style.bgImage', label: 'Background image', type: 'image', when: (s) => s.style.tone === 'custom' && s.style.bgType === 'image' },
  { key: 'style.overlay', label: 'Darken image', type: 'range', min: 0, max: 0.9, step: 0.05, when: (s) => s.style.tone === 'custom' && s.style.bgType === 'image' },
  { key: 'style.textColor', label: 'Text colour', type: 'color', when: (s) => s.style.tone === 'custom', help: 'Empty keeps the theme colour.' },
  { key: 'style.accentColor', label: 'Accent colour override', type: 'color', help: 'Changes links and buttons inside this section only.' },
  { group: 'Spacing and size' },
  { key: 'style.paddingTop', label: 'Space above (px)', type: 'range', min: 0, max: 240, step: 4 },
  { key: 'style.paddingBottom', label: 'Space below (px)', type: 'range', min: 0, max: 240, step: 4 },
  { key: 'style.width', label: 'Content width', type: 'segmented', options: ['narrow', 'normal', 'wide', 'full'] },
  { key: 'style.minHeight', label: 'Minimum height (% of window)', type: 'range', min: 0, max: 100, step: 5 },
  { key: 'style.contentAlign', label: 'Text alignment', type: 'segmented', options: ['left', 'center'] },
  { key: 'style.fontScale', label: 'Text size', type: 'range', min: 0.8, max: 1.4, step: 0.05 },
  { key: 'style.radius', label: 'Corner roundness (px, empty = theme)', type: 'text' },
  { group: 'Edges and motion' },
  { key: 'style.borderTop', label: 'Line above', type: 'toggle' },
  { key: 'style.borderBottom', label: 'Line below', type: 'toggle' },
  {
    key: 'style.animation',
    label: 'Entrance while scrolling',
    type: 'segmented',
    options: [
      { value: 'auto', label: 'Site default' },
      { value: 'off', label: 'None' },
      { value: 'fade', label: 'Fade' },
      { value: 'rise', label: 'Rise' },
      { value: 'genie', label: 'Genie' },
    ],
    help: 'Site default is set in Dashboard > Design > Motion. Visitors who prefer reduced motion never see it.',
  },
];

export const ADVANCED_FIELDS = [
  { key: 'style.anchor', label: 'Anchor id', type: 'text', help: 'Lets buttons scroll here. Letters, numbers and dashes.' },
  { key: 'hidden', label: 'Hide this section from visitors', type: 'toggle' },
  { key: 'style.hideMobile', label: 'Hide on phones', type: 'toggle' },
  { key: 'style.hideDesktop', label: 'Hide on large screens', type: 'toggle' },
  { key: 'style.className', label: 'Extra CSS classes', type: 'text', help: 'Tailwind classes work, e.g. italic tracking-wide' },
  { key: 'style.customCss', label: 'Custom CSS', type: 'code', rows: 8, help: 'Use & for this section, e.g.  & h2 { letter-spacing: -0.02em }  — or write plain declarations.' },
];

/* ------------------------------------------------------------------ */
/* Blocks (inside a Free layout section)                               */
/* ------------------------------------------------------------------ */

const ALIGN = { key: 'align', label: 'Alignment', type: 'segmented', options: ['left', 'center', 'right'] };

export const BLOCKS = {
  heading: {
    label: 'Heading',
    defaults: { text: 'Heading', level: 2, align: 'left' },
    fields: [{ key: 'text', label: 'Text', type: 'text' }, { key: 'level', label: 'Size', type: 'segmented', options: [1, 2, 3, 4] }, ALIGN],
    preview: (p) => p.text,
  },
  text: {
    label: 'Text',
    defaults: { markdown: 'Some text.', align: 'left', size: 'md' },
    fields: [{ key: 'markdown', label: 'Text', type: 'markdown', rows: 6 }, { key: 'size', label: 'Size', type: 'segmented', options: ['sm', 'md', 'lg'] }, ALIGN],
    preview: (p) => (p.markdown || '').replace(/[#*_>`]/g, '').slice(0, 60),
  },
  image: {
    label: 'Image',
    defaults: { src: '', alt: '', caption: '', aspect: 'auto', width: 100, shape: 'rounded', align: 'center' },
    fields: [
      { key: 'src', label: 'Image', type: 'image' },
      { key: 'alt', label: 'Description', type: 'text' },
      { key: 'caption', label: 'Caption', type: 'text' },
      { key: 'aspect', label: 'Shape', type: 'segmented', options: ['auto', '16/9', '4/3', '1/1', '3/4'] },
      { key: 'shape', label: 'Corners', type: 'segmented', options: ['square', 'rounded', 'arch', 'circle'] },
      { key: 'width', label: 'Width (%)', type: 'range', min: 20, max: 100, step: 5 },
      ALIGN,
    ],
    preview: (p) => p.caption || p.alt || (p.src ? 'Image' : 'No image yet'),
  },
  buttons: {
    label: 'Buttons',
    defaults: { items: [{ label: 'Button', action: 'drawer', target: 'contact', style: 'solid', icon: '' }], align: 'left' },
    fields: [
      { key: 'items', label: 'Buttons', type: 'list', fields: BUTTON_FIELDS, itemLabel: (b) => b.label || 'Button', addLabel: 'Add button', newItem: () => ({ label: 'Button', action: 'drawer', target: 'contact', style: 'outline', icon: '' }) },
      ALIGN,
    ],
    preview: (p) => (p.items || []).map((b) => b.label).join(', '),
  },
  quote: {
    label: 'Quote',
    defaults: { text: 'A sentence worth quoting.', cite: '', align: 'left' },
    fields: [{ key: 'text', label: 'Quote', type: 'textarea', rows: 3 }, { key: 'cite', label: 'Who said it', type: 'text' }, ALIGN],
    preview: (p) => p.text,
  },
  list: {
    label: 'Checklist',
    defaults: { items: 'First point\nSecond point\nThird point', icon: 'Check', columns: 1 },
    fields: [{ key: 'items', label: 'Points (one per line)', type: 'textarea', rows: 5 }, { key: 'icon', label: 'Icon', type: 'icon' }, { key: 'columns', label: 'Columns', type: 'segmented', options: [1, 2, 3] }],
    preview: (p) => (p.items || '').split('\n')[0],
  },
  cards: {
    label: 'Cards',
    defaults: { columns: 3, style: 'outline', items: [{ title: 'Card title', text: 'A short description.', icon: 'Sparkles', action: '', target: '' }] },
    fields: [
      { key: 'columns', label: 'Columns', type: 'segmented', options: [1, 2, 3, 4] },
      { key: 'style', label: 'Style', type: 'segmented', options: ['outline', 'filled', 'shadow', 'plain'] },
      {
        key: 'items',
        label: 'Cards',
        type: 'list',
        itemLabel: (c) => c.title || 'Card',
        addLabel: 'Add card',
        newItem: () => ({ title: 'Card title', text: 'A short description.', icon: 'Sparkles', action: '', target: '' }),
        fields: [
          { key: 'title', label: 'Title', type: 'text' },
          { key: 'text', label: 'Text (markdown)', type: 'textarea', rows: 3 },
          { key: 'icon', label: 'Icon', type: 'icon' },
          { key: 'image', label: 'Image', type: 'image' },
          { key: 'action', label: 'When clicked', type: 'select', options: [{ value: '', label: 'Nothing' }, ...ACTIONS] },
          { key: 'target', label: 'Target', type: 'action-target' },
        ],
      },
    ],
    preview: (p) => `${(p.items || []).length} card(s)`,
  },
  columns: {
    label: 'Columns',
    container: true,
    defaults: { layout: '1:1', gap: 'md', valign: 'top' },
    fields: [
      { key: 'layout', label: 'Split', type: 'segmented', options: ['1:1', '2:1', '1:2', '1:1:1', '1:1:1:1'] },
      { key: 'gap', label: 'Gap', type: 'segmented', options: ['sm', 'md', 'lg'] },
      { key: 'valign', label: 'Vertical alignment', type: 'segmented', options: ['top', 'center', 'bottom'] },
    ],
    preview: (p, b) => `${p.layout} — ${(b.children || []).map((c) => c.length).join(' / ')} block(s)`,
  },
  embed: {
    label: 'Video / embed',
    defaults: { url: '', aspect: '16/9', title: 'Embedded content' },
    fields: [
      { key: 'url', label: 'Link', type: 'text', help: 'YouTube, Vimeo, Google Slides/Docs/Maps or any embeddable page.' },
      { key: 'aspect', label: 'Shape', type: 'segmented', options: ['16/9', '4/3', '1/1', '9/16'] },
      { key: 'title', label: 'Title (for screen readers)', type: 'text' },
    ],
    preview: (p) => p.url || 'No link yet',
  },
  divider: {
    label: 'Divider',
    defaults: { style: 'line' },
    fields: [{ key: 'style', label: 'Style', type: 'segmented', options: ['line', 'dots', 'wave'] }],
    preview: (p) => p.style,
  },
  spacer: {
    label: 'Spacer',
    defaults: { height: 40 },
    fields: [{ key: 'height', label: 'Height (px)', type: 'range', min: 8, max: 240, step: 8 }],
    preview: (p) => `${p.height}px`,
  },
  html: {
    label: 'HTML',
    defaults: { code: '<p>Custom HTML</p>' },
    fields: [{ key: 'code', label: 'HTML', type: 'code', rows: 8, help: 'Scripts do not run. Use Video / embed for iframes.' }],
    preview: (p) => (p.code || '').slice(0, 50),
  },
};

export const BLOCK_KEYS = Object.keys(BLOCKS);
export const COLUMN_COUNTS = { '1:1': 2, '2:1': 2, '1:2': 2, '1:1:1': 3, '1:1:1:1': 4 };

export function createBlock(type) {
  const def = BLOCKS[type];
  const block = { id: uid('b'), type, props: clone(def?.defaults || {}) };
  if (def?.container) block.children = Array.from({ length: COLUMN_COUNTS[block.props.layout] || 2 }, () => []);
  return block;
}

export function normalizeBlock(block) {
  const def = BLOCKS[block?.type];
  if (!def) return block;
  const next = { ...block, id: block.id || uid('b'), props: { ...clone(def.defaults), ...(block.props || {}) } };
  if (def.container) {
    const count = COLUMN_COUNTS[next.props.layout] || 2;
    const kids = Array.isArray(block.children) ? block.children.map((c) => (Array.isArray(c) ? c : [])) : [];
    while (kids.length < count) kids.push([]);
    if (kids.length > count) {
      const extra = kids.splice(count).flat();
      kids[count - 1] = [...kids[count - 1], ...extra];
    }
    next.children = kids.map((col) => col.filter((c) => !BLOCKS[c?.type]?.container).map(normalizeBlock));
  }
  return next;
}

/* ------------------------------------------------------------------ */
/* Normalising                                                         */
/* ------------------------------------------------------------------ */

/** Fill a stored section with every default so renderers never see undefined. */
export function normalizeSection(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const kind = KINDS[raw.kind] ? raw.kind : 'blocks';
  const defs = KINDS[kind].defaults();
  const section = {
    id: raw.id || uid('s'),
    kind,
    hidden: Boolean(raw.hidden),
    heading: { ...DEFAULT_HEADING, ...(raw.heading || {}) },
    props: deepMerge(defs.props || {}, raw.props || {}),
    style: { ...DEFAULT_STYLE, ...(defs.style || {}), ...(raw.style || {}) },
    viewAll: { ...DEFAULT_VIEWALL, ...(raw.viewAll || {}) },
  };
  if (kind === 'blocks') section.props.blocks = (section.props.blocks || []).map(normalizeBlock);
  return section;
}

export function createSection(kind, overrides = {}) {
  const defs = KINDS[kind].defaults();
  return normalizeSection({
    id: uid('s'),
    kind,
    heading: { title: overrides.title ?? (KINDS[kind].hasHeading ? 'New section' : '') },
    props: defs.props,
    style: defs.style,
    ...overrides,
  });
}

/* ------------------------------------------------------------------ */
/* Templates for the "Add section" dialog                              */
/* ------------------------------------------------------------------ */

const block = (type, props = {}, children) => {
  const b = createBlock(type);
  b.props = { ...b.props, ...props };
  if (children) b.children = children;
  return b;
};

export const TEMPLATES = [
  { id: 'list-publications', group: 'Content', kind: 'collection', label: 'Publication list', description: 'Numbered citations with search.', make: () => createSection('collection', { heading: { title: 'Publications' }, props: { collection: 'publications', mode: 'citation', sortField: 'year', sortDir: 'desc', showSearch: true } }) },
  { id: 'list-timeline', group: 'Content', kind: 'collection', label: 'Timeline', description: 'Experience or education on a line.', make: () => createSection('collection', { heading: { title: 'Experience' }, props: { collection: 'experience', mode: 'timeline' } }) },
  { id: 'list-cards', group: 'Content', kind: 'collection', label: 'Card grid', description: 'Research areas, team, projects.', make: () => createSection('collection', { heading: { title: 'Research areas' }, props: { collection: 'research', mode: 'cards', columns: 3 } }) },
  { id: 'list-rows', group: 'Content', kind: 'collection', label: 'Compact list', description: 'Awards, news, grants, one per line.', make: () => createSection('collection', { heading: { title: 'Awards' }, props: { collection: 'awards', mode: 'minimal', sortField: 'year', sortDir: 'desc' } }) },
  { id: 'list-photos', group: 'Content', kind: 'collection', label: 'Photo wall', description: 'Gallery images.', make: () => createSection('collection', { heading: { title: 'Gallery' }, props: { collection: 'gallery', mode: 'masonry', columns: 3 } }) },
  { id: 'hero', group: 'Introduction', kind: 'hero', label: 'Introduction', description: 'Photo, name, titles and buttons.', make: () => createSection('hero') },
  { id: 'text', group: 'Writing', kind: 'richtext', label: 'Text', description: 'A heading and formatted text.', make: () => createSection('richtext', { heading: { title: 'Section title' } }) },
  { id: 'text-image', group: 'Writing', kind: 'richtext', label: 'Text beside image', description: 'Photo on one side, text on the other.', make: () => createSection('richtext', { heading: { title: 'Section title' }, props: { imageSide: 'right', imageWidth: 40 } }) },
  { id: 'facts', group: 'Writing', kind: 'richtext', label: 'Text with key facts', description: 'Paragraphs and a short fact list.', make: () => createSection('richtext', { heading: { title: 'At a glance' }, props: { factsTitle: 'Key facts', facts: [{ label: 'Label', value: 'Value' }] } }) },
  { id: 'quote', group: 'Writing', kind: 'blocks', label: 'Quote', description: 'One large quotation.', make: () => createSection('blocks', { heading: { show: false }, props: { blocks: [block('quote', { text: 'A sentence worth quoting.', cite: 'Name' })] }, style: { width: 'narrow' } }) },
  { id: 'cta', group: 'Action', kind: 'blocks', label: 'Call to action', description: 'A prompt with buttons on a coloured band.', make: () => createSection('blocks', { heading: { show: false }, props: { blocks: [block('heading', { text: 'Interested in working together?', align: 'center' }), block('text', { markdown: 'I welcome students and collaborators working on AI for health and smart cities.', align: 'center' }), block('buttons', { align: 'center', items: [{ label: 'Get in touch', action: 'drawer', target: 'contact', style: 'solid', icon: 'Mail' }] })] }, style: { tone: 'accent', width: 'narrow' } }) },
  { id: 'cards-static', group: 'Action', kind: 'blocks', label: 'Feature cards', description: 'Cards you write by hand.', make: () => createSection('blocks', { heading: { title: 'Highlights' }, props: { blocks: [block('cards')] } }) },
  { id: 'two-col', group: 'Layout', kind: 'blocks', label: 'Two columns', description: 'Text and image side by side.', make: () => createSection('blocks', { heading: { title: 'Section title' }, props: { blocks: [block('columns', { layout: '1:1', valign: 'center' }, [[block('text', { markdown: 'Left column text.' })], [block('image')]])] } }) },
  { id: 'video', group: 'Layout', kind: 'blocks', label: 'Video', description: 'A YouTube or Vimeo video.', make: () => createSection('blocks', { heading: { title: 'Watch' }, props: { blocks: [block('embed')] }, style: { width: 'narrow' } }) },
  { id: 'blank', group: 'Layout', kind: 'blocks', label: 'Blank', description: 'Start empty and add blocks.', make: () => createSection('blocks', { heading: { title: '' , show: false } }) },
  { id: 'stats', group: 'Action', kind: 'stats', label: 'Numbers', description: 'Counts of papers, grants and more.', make: () => createSection('stats', { heading: { show: false }, props: { items: [{ label: 'Publications', source: 'publications' }, { label: 'Awards', source: 'awards' }, { label: 'Grants', source: 'grants' }] }, style: { tone: 'contrast', paddingTop: 56, paddingBottom: 56 } }) },
  { id: 'contact', group: 'Action', kind: 'contact', label: 'Contact', description: 'Details, form and map.', make: () => createSection('contact', { heading: { title: 'Contact' } }) },
];

export const TEMPLATE_GROUPS = ['Content', 'Writing', 'Introduction', 'Action', 'Layout'];

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

// Menu icon guessed from a tab's address or name when none was chosen.
const NAV_ICON_GUESSES = [
  [/^home$|^index$/, 'Home'],
  [/about|bio|profile/, 'User'],
  [/research|lab/, 'FlaskConical'],
  [/publication|paper|article/, 'BookOpen'],
  [/experience|career|work|cv|resume/, 'Briefcase'],
  [/award|honou?r|prize|achievement/, 'Award'],
  [/group|team|student|people|member/, 'Users'],
  [/gallery|photo|media/, 'Images'],
  [/contact|reach/, 'Mail'],
  [/teach|course|class/, 'GraduationCap'],
  [/project/, 'Layers'],
  [/blog|news|post/, 'PenLine'],
  [/talk|event|seminar|conference/, 'Presentation'],
];

/** Icon name for the menu, or null for none. */
export function navIconFor(page) {
  if (!page) return null;
  if (page.navIcon === 'none') return null;
  if (page.navIcon) return page.navIcon;
  const text = `${page.id} ${page.navLabel || ''} ${page.title || ''}`.toLowerCase();
  return NAV_ICON_GUESSES.find(([re]) => re.test(page.id) || re.test(text))?.[1] || 'FileText';
}

export const DEFAULT_PAGE_HEADER = {
  show: true,
  title: '',
  subtitle: '',
  align: 'left',
  tone: 'inherit', // inherit | soft | muted | card | contrast | accent | custom
  size: 'normal', // compact | normal | tall
  bgType: 'color', // color | gradient | image (tone = custom)
  bgColor: '',
  bgColor2: '',
  bgAngle: 135,
  bgImage: '',
  overlay: 0.45,
  textColor: '',
};

/** Background behind the whole tab (sections without their own background show it). */
export const DEFAULT_PAGE_BACKGROUND = { type: 'none', color: '', color2: '', angle: 160, image: '', overlay: 0.3, fixed: false, textColor: '' };

/** Form for a tab's title band and page background (Tab settings). */
export const PAGE_LOOK_FIELDS = [
  { group: 'Title band background' },
  {
    key: 'header.tone',
    label: 'Background',
    type: 'segmented',
    options: [
      { value: 'inherit', label: 'Page' },
      { value: 'soft', label: 'Soft' },
      { value: 'muted', label: 'Muted' },
      { value: 'card', label: 'Card' },
      { value: 'contrast', label: 'Dark' },
      { value: 'accent', label: 'Accent' },
      { value: 'custom', label: 'Custom' },
    ],
  },
  { key: 'header.bgType', label: 'Custom background', type: 'segmented', options: [{ value: 'color', label: 'Colour' }, { value: 'gradient', label: 'Gradient' }, { value: 'image', label: 'Image' }], when: (d) => d.header.tone === 'custom' },
  { key: 'header.bgColor', label: 'Colour', type: 'color', when: (d) => d.header.tone === 'custom' && d.header.bgType !== 'image' },
  { key: 'header.bgColor2', label: 'Second colour', type: 'color', when: (d) => d.header.tone === 'custom' && d.header.bgType === 'gradient' },
  { key: 'header.bgAngle', label: 'Gradient angle', type: 'range', min: 0, max: 360, step: 5, when: (d) => d.header.tone === 'custom' && d.header.bgType === 'gradient' },
  { key: 'header.bgImage', label: 'Image', type: 'image', when: (d) => d.header.tone === 'custom' && d.header.bgType === 'image' },
  { key: 'header.overlay', label: 'Darken the image', type: 'range', min: 0, max: 0.9, step: 0.05, when: (d) => d.header.tone === 'custom' && d.header.bgType === 'image', help: 'Makes light text readable on busy photos.' },
  { key: 'header.textColor', label: 'Text colour (empty = theme)', type: 'color', when: (d) => d.header.tone === 'custom' },
  { key: 'header.size', label: 'Band height', type: 'segmented', options: [{ value: 'compact', label: 'Compact' }, { value: 'normal', label: 'Normal' }, { value: 'tall', label: 'Tall' }] },
  { group: 'Background of the whole tab' },
  {
    key: 'background.type',
    label: 'Tab background',
    type: 'segmented',
    options: [
      { value: 'none', label: 'Theme' },
      { value: 'color', label: 'Colour' },
      { value: 'gradient', label: 'Gradient' },
      { value: 'image', label: 'Image' },
    ],
    help: 'Shows behind every section that uses the “inherit” background.',
  },
  { key: 'background.color', label: 'Colour', type: 'color', when: (d) => ['color', 'gradient'].includes(d.background.type) },
  { key: 'background.color2', label: 'Second colour', type: 'color', when: (d) => d.background.type === 'gradient' },
  { key: 'background.angle', label: 'Gradient angle', type: 'range', min: 0, max: 360, step: 5, when: (d) => d.background.type === 'gradient' },
  { key: 'background.image', label: 'Image', type: 'image', when: (d) => d.background.type === 'image' },
  { key: 'background.overlay', label: 'Fade the image', type: 'range', min: 0, max: 0.95, step: 0.05, when: (d) => d.background.type === 'image', help: 'Covers the photo with the page colour so text stays readable.' },
  { key: 'background.fixed', label: 'Keep the image still while scrolling', type: 'toggle', when: (d) => d.background.type === 'image' },
  { key: 'background.textColor', label: 'Text colour (empty = theme)', type: 'color', when: (d) => d.background.type !== 'none' },
];

export function normalizePage(page) {
  if (!page) return null;
  return {
    ...page,
    title: page.title || page.id,
    navLabel: page.navLabel || page.title || page.id,
    inNav: page.inNav !== false,
    header: { ...DEFAULT_PAGE_HEADER, title: page.title, ...(page.header || {}) },
    background: { ...DEFAULT_PAGE_BACKGROUND, ...(page.background || {}) },
    sections: Array.isArray(page.sections) ? page.sections : [],
  };
}

export const PAGE_TEMPLATES = [
  { id: 'blank', label: 'Blank tab', description: 'Just a title. Add sections afterwards.', sections: () => [] },
  { id: 'list', label: 'Collection tab', description: 'Lists every item from one collection.', needsCollection: true, sections: (c) => [createSection('collection', { heading: { show: false }, props: { collection: c, mode: c === 'publications' ? 'citation' : c === 'gallery' ? 'masonry' : 'list', showSearch: true } })] },
  { id: 'text', label: 'Text tab', description: 'A page of writing with an image.', sections: () => [createSection('richtext', { heading: { show: false }, props: { imageSide: 'right' } })] },
  { id: 'contact', label: 'Contact tab', description: 'Contact details and a form.', sections: () => [createSection('contact', { heading: { show: false } })] },
];
