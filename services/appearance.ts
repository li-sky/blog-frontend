import palettes from '../styles/color-palettes.json';

export { palettes };
export type ThemeMode = 'light' | 'dark' | 'system';
export interface Appearance { mode: ThemeMode; palette: string; }
export const DEFAULT_PALETTE = 'solarized';
const isMode = (value: string | null): value is ThemeMode => value === 'light' || value === 'dark' || value === 'system';

export function readAppearance(storage: Pick<Storage, 'getItem'>): Appearance {
  try {
    const mode = storage.getItem('theme');
    const palette = storage.getItem('color-palette');
    return { mode: isMode(mode) ? mode : 'system', palette: palettes.some(item => item.id === palette) ? palette! : DEFAULT_PALETTE };
  } catch { return { mode: 'system', palette: DEFAULT_PALETTE }; }
}
export const isDarkMode = (mode: ThemeMode, systemDark: boolean) => mode === 'dark' || (mode === 'system' && systemDark);
export function applyAppearance(root: HTMLElement, appearance: Appearance, systemDark: boolean) {
  const dark = isDarkMode(appearance.mode, systemDark);
  root.classList.toggle('dark', dark);
  root.dataset.colorPalette = appearance.palette;
  root.style.colorScheme = dark ? 'dark' : 'light';
  const meta = root.ownerDocument?.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (meta) meta.content = appearance.mode === 'system' ? 'light dark' : appearance.mode;
}
export function nextTheme(mode: ThemeMode, systemDark: boolean): ThemeMode {
  return isDarkMode(mode, systemDark) ? 'light' : 'dark';
}

interface Clock { schedule(callback: () => void, delay: number): number; cancel(id: number): void; now(): number; }
export function paletteLongPress(open: () => void, clock: Clock = { schedule: (callback, delay) => window.setTimeout(callback, delay), cancel: id => window.clearTimeout(id), now: Date.now }, onHoldingChange: (holding: boolean) => void = () => {}) {
  let timer: number | null = null;
  let start: { x: number; y: number } | null = null;
  let suppressUntil = 0;
  const cancel = () => { if (timer !== null) clock.cancel(timer); timer = null; start = null; onHoldingChange(false); };
  return {
    start(pointerType: string, x: number, y: number) {
      cancel();
      if (pointerType !== 'touch' && pointerType !== 'pen') return;
      start = { x, y };
      onHoldingChange(true);
      timer = clock.schedule(() => { timer = null; start = null; onHoldingChange(false); suppressUntil = clock.now() + 1000; open(); }, 550);
    },
    move(x: number, y: number) { if (start && Math.hypot(x - start.x, y - start.y) > 10) cancel(); },
    cancel,
    isHolding: () => timer !== null,
    consumeClick() { if (suppressUntil > clock.now()) { suppressUntil = 0; return true; } return false; },
  };
}
