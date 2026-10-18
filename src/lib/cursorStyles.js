/** Pointer styles offered in Design > Pointer (drawn by CursorFx.js). */
export const CURSOR_STYLES = [
  { value: 'comet', label: 'Comet', text: 'Accent arrow with a glowing tail that follows it.' },
  { value: 'arrow', label: 'Arrow', text: 'Accent arrow that tilts and glows over clickable things. No tail.' },
  { value: 'ring', label: 'Ring', text: 'Small dot with a ring that wraps around buttons and links.' },
  { value: 'sparkle', label: 'Sparkle', text: 'Accent arrow that scatters small sparks as it moves and on click.' },
  { value: 'glow', label: 'Spotlight', text: 'Normal pointer with a soft glow of colour that follows it.' },
  { value: 'none', label: 'Standard', text: 'The usual system pointer, no effects.' },
];

const VALUES = CURSOR_STYLES.map((s) => s.value);

/** The chosen style, including older settings that only had on/off. */
export function cursorStyleOf(effects) {
  if (effects?.cursor === false) return 'none';
  return VALUES.includes(effects?.cursorStyle) ? effects.cursorStyle : 'comet';
}
