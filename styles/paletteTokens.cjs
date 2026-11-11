const palettes = JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname, 'color-palettes.json'), 'utf8'));
const rgb = hex => hex.replace('#', '').match(/../g).map(value => parseInt(value, 16));
const mix = (a, b, amount) => '#' + rgb(a).map((value, i) => Math.round(value * (1 - amount) + rgb(b)[i] * amount).toString(16).padStart(2, '0')).join('');

function paletteTokens(scheme, dark) {
  const { canvas, surface, text, muted, border, accent, primary } = scheme;
  const gray = dark
    ? { 50: mix(text, '#ffffff', .15), 100: text, 200: mix(text, muted, .25), 300: muted, 400: muted, 500: mix(muted, border, .25), 600: mix(border, text, .1), 700: border, 800: surface, 900: canvas, 950: mix(canvas, '#000000', .2) }
    : { 50: canvas, 100: mix(canvas, border, .25), 200: border, 300: mix(border, muted, .25), 400: mix(muted, canvas, .15), 500: muted, 600: mix(muted, text, .4), 700: mix(muted, text, .75), 800: text, 900: text, 950: mix(text, '#000000', .2) };
  const accents = { 50: mix(canvas, accent, .08), 100: mix(canvas, accent, .15), 200: mix(accent, '#ffffff', .6), 300: mix(accent, '#ffffff', .3), 400: dark ? accent : mix(primary, '#ffffff', .15), 500: primary, 600: primary, 700: mix(primary, '#000000', .15), 800: mix(primary, '#000000', .3), 900: mix(canvas, accent, .25), 950: mix(canvas, accent, .1) };
  const result = { '--site-error': dark ? '#fca5a5' : '#b91c1c', '--site-success': dark ? '#86efac' : '#15803d', '--site-warning': dark ? '#fed7aa' : '#9a3412' };
  for (const [step, value] of Object.entries(gray)) result[`--palette-gray-${step}`] = rgb(value).join(' ');
  for (const [step, value] of Object.entries(accents)) result[`--palette-accent-${step}`] = rgb(value).join(' ');
  for (const [key, value] of Object.entries(scheme)) { result[`--site-${key}`] = value; result[`--site-${key}-rgb`] = rgb(value).join(' '); }
  return result;
}
function paletteBase() {
  const solarized = palettes.find(palette => palette.id === 'solarized');
  const result = { ':root': paletteTokens(solarized.light, false), ':root.dark': paletteTokens(solarized.dark, true) };
  for (const palette of palettes) {
    result[`:root[data-color-palette="${palette.id}"]`] = paletteTokens(palette.light, false);
    result[`:root.dark[data-color-palette="${palette.id}"]`] = paletteTokens(palette.dark, true);
  }
  return result;
}
module.exports = { paletteTokens, paletteBase };
