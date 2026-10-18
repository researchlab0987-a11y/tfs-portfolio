/**
 * THEMES
 * src/lib/themes.js
 *
 * A theme is 13 colour tokens. They are written to <html> as CSS variables
 * (and duplicated as --base-* so a section can invert them without circular
 * references; see the .tone-* classes in globals.css).
 */

export const COLOR_TOKENS = [
  ['--bg-primary', 'Page background'],
  ['--bg-secondary', 'Soft band'],
  ['--bg-tertiary', 'Deeper band'],
  ['--card-bg', 'Cards'],
  ['--border', 'Lines'],
  ['--text-primary', 'Text'],
  ['--text-secondary', 'Secondary text'],
  ['--text-muted', 'Faint text'],
  ['--accent', 'Accent'],
  ['--accent-hover', 'Accent (hover)'],
  ['--accent-light', 'Accent tint'],
  ['--accent-contrast', 'Text on accent'],
  ['--highlight', 'Highlight'],
];

const t = (bg, bg2, bg3, card, border, text, text2, muted, accent, accentHover, accentLight, accentContrast, highlight) => ({
  '--bg-primary': bg,
  '--bg-secondary': bg2,
  '--bg-tertiary': bg3,
  '--card-bg': card,
  '--border': border,
  '--text-primary': text,
  '--text-secondary': text2,
  '--text-muted': muted,
  '--accent': accent,
  '--accent-hover': accentHover,
  '--accent-light': accentLight,
  '--accent-contrast': accentContrast,
  '--highlight': highlight,
});

export const PRESETS = [
  { id: 'signal', name: 'Signal', note: 'Cool mist, navy ink, jade accent', colors: t('#F4F6F8', '#E9EEF2', '#DCE3E9', '#FFFFFF', '#D3DBE3', '#132034', '#45556B', '#7A889B', '#0D7A6F', '#0A635A', '#DDF1EE', '#FFFFFF', '#D99A2B') },
  { id: 'porcelain', name: 'Porcelain', note: 'White, indigo ink, cobalt', colors: t('#F8F9FC', '#EEF1F8', '#E1E6F2', '#FFFFFF', '#D8DEEC', '#1B1F3B', '#4A5072', '#868BA8', '#2F49D1', '#2338A8', '#E4E9FC', '#FFFFFF', '#E0A100') },
  { id: 'maroon', name: 'BUET Maroon', note: 'Warm white, maroon accent', colors: t('#FAF8F7', '#F2ECEA', '#E7DEDB', '#FFFFFF', '#E1D5D2', '#2A1416', '#5B4245', '#957D80', '#8C1C2B', '#701623', '#F6E3E5', '#FFFFFF', '#C68A2E') },
  { id: 'forest', name: 'Forest', note: 'Sage paper, deep green', colors: t('#F3F6F2', '#E7EDE5', '#D9E2D6', '#FFFFFF', '#CFD9CC', '#1C2A21', '#46564B', '#7C8A80', '#2F6B3D', '#245531', '#DDEDE0', '#FFFFFF', '#B9852B') },
  { id: 'rose', name: 'Rose', note: 'Blush white, berry accent', colors: t('#FBF7F8', '#F4ECEF', '#EADDE2', '#FFFFFF', '#E6D6DC', '#2B1B22', '#5C4650', '#98808B', '#A8325E', '#88264B', '#F7E1EA', '#FFFFFF', '#2E7D8C') },
  { id: 'graphite', name: 'Graphite', note: 'Neutral greys, steel blue', colors: t('#F6F6F5', '#ECECEA', '#DFDFDC', '#FFFFFF', '#D6D6D2', '#1F2328', '#4B5159', '#868B92', '#2F5F84', '#244B69', '#E1EAF2', '#FFFFFF', '#C2763A') },
  { id: 'lab-night', name: 'Lab at night', note: 'Dark slate, teal accent', colors: t('#0F1620', '#152030', '#1D2B3E', '#131D2A', '#263548', '#E6EDF5', '#A9B6C6', '#6E7E92', '#3BB8AA', '#5ACCBF', '#123B3A', '#06201E', '#E8B04A') },
  { id: 'indigo-night', name: 'Indigo night', note: 'Deep indigo, periwinkle', colors: t('#11131F', '#181B2B', '#21253A', '#161927', '#2C3150', '#E8E9F3', '#B0B3CC', '#767A99', '#8EA2FF', '#A9B8FF', '#262D55', '#0D1030', '#F2C46D') },
];

export const getPreset = (id) => PRESETS.find((p) => p.id === id) || PRESETS[0];

export function themeColors(theme) {
  if (theme?.preset === 'custom' && theme.custom) return { ...PRESETS[0].colors, ...theme.custom };
  return getPreset(theme?.preset).colors;
}

/* ------------------------------------------------------------------ */
/* Fonts                                                               */
/* ------------------------------------------------------------------ */

export const HEADING_FONTS = [
  { name: 'Newsreader', stack: "'Newsreader', Georgia, serif", query: 'Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600' },
  { name: 'Fraunces', stack: "'Fraunces', Georgia, serif", query: 'Fraunces:opsz,wght@9..144,400;9..144,600' },
  { name: 'Source Serif 4', stack: "'Source Serif 4', Georgia, serif", query: 'Source+Serif+4:opsz,wght@8..60,400;8..60,600' },
  { name: 'Lora', stack: "'Lora', Georgia, serif", query: 'Lora:wght@400;500;600' },
  { name: 'Libre Baskerville', stack: "'Libre Baskerville', Georgia, serif", query: 'Libre+Baskerville:wght@400;700' },
  { name: 'Cormorant Garamond', stack: "'Cormorant Garamond', Georgia, serif", query: 'Cormorant+Garamond:wght@500;600;700' },
  { name: 'DM Serif Display', stack: "'DM Serif Display', Georgia, serif", query: 'DM+Serif+Display' },
  { name: 'Instrument Sans', stack: "'Instrument Sans', system-ui, sans-serif", query: 'Instrument+Sans:wght@400;500;600;700' },
  { name: 'Manrope', stack: "'Manrope', system-ui, sans-serif", query: 'Manrope:wght@400;500;600;700' },
  { name: 'Space Grotesk', stack: "'Space Grotesk', system-ui, sans-serif", query: 'Space+Grotesk:wght@400;500;600;700' },
  { name: 'Hind Siliguri', stack: "'Hind Siliguri', system-ui, sans-serif", query: 'Hind+Siliguri:wght@400;500;600' },
  { name: 'System sans', stack: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', query: '' },
  { name: 'System serif', stack: 'Georgia, Cambria, "Times New Roman", serif', query: '' },
];

export const BODY_FONTS = [
  { name: 'Instrument Sans', stack: "'Instrument Sans', system-ui, sans-serif", query: 'Instrument+Sans:wght@400;500;600;700' },
  { name: 'Public Sans', stack: "'Public Sans', system-ui, sans-serif", query: 'Public+Sans:wght@400;500;600;700' },
  { name: 'IBM Plex Sans', stack: "'IBM Plex Sans', system-ui, sans-serif", query: 'IBM+Plex+Sans:wght@400;500;600' },
  { name: 'Manrope', stack: "'Manrope', system-ui, sans-serif", query: 'Manrope:wght@400;500;600;700' },
  { name: 'Work Sans', stack: "'Work Sans', system-ui, sans-serif", query: 'Work+Sans:wght@400;500;600' },
  { name: 'Source Serif 4', stack: "'Source Serif 4', Georgia, serif", query: 'Source+Serif+4:opsz,wght@8..60,400;8..60,600' },
  { name: 'Lora', stack: "'Lora', Georgia, serif", query: 'Lora:wght@400;500;600' },
  { name: 'Hind Siliguri', stack: "'Hind Siliguri', system-ui, sans-serif", query: 'Hind+Siliguri:wght@400;500;600' },
  { name: 'System sans', stack: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', query: '' },
];

// Bangla text (e.g. award names) falls through to these if the main font lacks the glyphs.
const BANGLA = "'Noto Sans Bengali', 'Hind Siliguri'";
const BANGLA_QUERY = 'Noto+Sans+Bengali:wght@400;600';

export const findFont = (list, name) => list.find((f) => f.name === name) || list[0];

export function fontsHref(fonts) {
  const h = findFont(HEADING_FONTS, fonts?.heading);
  const b = findFont(BODY_FONTS, fonts?.body);
  const families = [...new Set([h.query, b.query, BANGLA_QUERY].filter(Boolean))];
  return `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join('&')}&display=swap`;
}

/** CSS variables for the whole theme. Used inline on <html>. */
export function themeVars(theme) {
  const colors = themeColors(theme);
  const h = findFont(HEADING_FONTS, theme?.fonts?.heading);
  const b = findFont(BODY_FONTS, theme?.fonts?.body);
  const vars = { ...colors };
  for (const [k, v] of Object.entries(colors)) vars[k.replace('--', '--base-')] = v;
  vars['--font-heading'] = `${h.stack.replace(/, (serif|sans-serif)$/, '')}, ${BANGLA}, ${h.stack.split(',').pop().trim()}`;
  vars['--font-body'] = `${b.stack.replace(/, (serif|sans-serif)$/, '')}, ${BANGLA}, ${b.stack.split(',').pop().trim()}`;
  vars['--radius'] = `${Number(theme?.radius ?? 14)}px`;
  vars['--base-size'] = `${Number(theme?.baseSize ?? 17)}px`;
  vars['--container'] = `${Number(theme?.container ?? 1180)}px`;
  return vars;
}

/** Perceived lightness, 0..1. */
export function luminance(hex) {
  const c = String(hex || '').replace('#', '');
  if (c.length !== 6) return 1;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export const isDarkTheme = (theme) => luminance(themeColors(theme)['--bg-primary']) < 0.5;
