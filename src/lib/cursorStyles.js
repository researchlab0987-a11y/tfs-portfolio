/** Pointer styles offered in Design > Pointer (drawn by CursorFx.js). */
export const CURSOR_STYLES = [
  { value: 'comet', label: 'Comet', text: 'Accent arrow with a glowing tail that follows it.' },
  { value: 'arrow', label: 'Arrow', text: 'Accent arrow that tilts and glows over clickable things. No tail.' },
  { value: 'ring', label: 'Ring', text: 'Small dot with a ring that wraps around buttons and links.' },
  { value: 'sparkle', label: 'Sparkle', text: 'Accent arrow that scatters small sparks as it moves and on click.' },
  { value: 'glow', label: 'Spotlight', text: 'Normal pointer with a soft glow of colour that follows it.' },
  { value: 'dot', label: 'Dot', text: 'A small dot with a softer dot that drifts after it.' },
  { value: 'invert', label: 'Invert', text: 'A circle that inverts the colours underneath; grows over links.' },
  { value: 'crosshair', label: 'Crosshair', text: 'Precise crosshair, like a drawing tool; circles clickable things.' },
  { value: 'ripple', label: 'Ripple', text: 'Normal pointer; clicks send out rings and links get a pulse.' },
  { value: 'trail', label: 'Dotted trail', text: 'Accent arrow leaving a line of fading dots.' },
  { value: 'rainbow', label: 'Rainbow', text: 'Arrow with a colour-shifting comet tail.' },
  { value: 'pixel', label: 'Pixel', text: 'Arrow leaving a retro trail of little squares.' },
  { value: 'bubbles', label: 'Bubbles', text: 'Normal pointer with soft bubbles floating up as it moves.' },
  { value: 'laser', label: 'Laser', text: 'A glowing red laser-pointer dot with a short streak.' },
  { value: 'none', label: 'Standard', text: 'The usual system pointer, no effects.' },
];

const VALUES = CURSOR_STYLES.map((s) => s.value);

/** The chosen style, including older settings that only had on/off. */
export function cursorStyleOf(effects) {
  if (effects?.cursor === false) return 'none';
  return VALUES.includes(effects?.cursorStyle) ? effects.cursorStyle : 'comet';
}
