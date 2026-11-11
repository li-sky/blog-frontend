import { palettes } from './appearance';

interface Vector { x: number; y: number; z: number; }
type Reading = { x: number | null; y: number | null; z: number | null } | null;
export interface MotionSample { acceleration: Reading; accelerationIncludingGravity: Reading; }
const vector = (value: Reading): Vector | null => value && [value.x, value.y, value.z].every(item => typeof item === 'number' && Number.isFinite(item)) ? value as Vector : null;
export const hasMotionData = (sample: MotionSample) => !!(vector(sample.acceleration) || vector(sample.accelerationIncludingGravity));

// Three strong alternating impulses are required. A single bump, steady gravity
// or ordinary walking does not count as a shake; repeated samples have a cooldown.
export function createShakeDetector() {
  let gravity: Vector | null = null;
  let previousTime: number | null = null;
  let source: 'linear' | 'gravity' | null = null;
  let pulse: Vector | null = null;
  let pulseTime = 0;
  let pulseCount = 0;
  let blockedUntil = 0;
  const clear = () => { gravity = null; previousTime = null; source = null; pulse = null; pulseCount = 0; };
  return {
    reset() { clear(); },
    pause(now: number, duration = 1200) { clear(); blockedUntil = Math.max(blockedUntil, now + duration); },
    push(sample: MotionSample, now: number) {
      if (!Number.isFinite(now)) return false;
      const linear = vector(sample.acceleration);
      const raw = linear || vector(sample.accelerationIncludingGravity);
      if (!raw) { clear(); return false; }
      const nextSource = linear ? 'linear' : 'gravity';
      const elapsed = previousTime === null ? 16 : now - previousTime;
      if (source !== nextSource || elapsed > 250 || elapsed <= 0) clear();
      source = nextSource; previousTime = now;
      let acceleration = raw;
      if (!linear) {
        if (!gravity) { gravity = raw; return false; }
        const alpha = 350 / (350 + Math.min(250, Math.max(1, elapsed)));
        gravity = { x: alpha * gravity.x + (1 - alpha) * raw.x, y: alpha * gravity.y + (1 - alpha) * raw.y, z: alpha * gravity.z + (1 - alpha) * raw.z };
        acceleration = { x: raw.x - gravity.x, y: raw.y - gravity.y, z: raw.z - gravity.z };
      }
      if (now < blockedUntil) { pulse = null; pulseCount = 0; return false; }
      const strength = Math.hypot(acceleration.x, acceleration.y, acceleration.z);
      if (strength < 18) return false;
      const direction = { x: acceleration.x / strength, y: acceleration.y / strength, z: acceleration.z / strength };
      if (!pulse || now - pulseTime > 450) { pulse = direction; pulseTime = now; pulseCount = 1; return false; }
      if (now - pulseTime < 80) return false;
      const opposite = pulse.x * direction.x + pulse.y * direction.y + pulse.z * direction.z < -.3;
      if (!opposite) return false;
      pulse = direction; pulseTime = now; pulseCount++;
      if (pulseCount < 3) return false;
      pulse = null; pulseCount = 0; blockedUntil = now + 2200;
      return true;
    },
  };
}

export function randomOtherPalette(current: string, random = Math.random): string {
  const candidates = palettes.filter(palette => palette.id !== current);
  const value = random();
  const index = Number.isFinite(value) ? Math.min(candidates.length - 1, Math.max(0, Math.floor(value * candidates.length))) : 0;
  return candidates[index].id;
}

export interface MotionPermissionSource { requestPermission?: () => Promise<'granted' | 'denied'>; }
// Called directly from the enable button, preserving the browser's user gesture.
export function requestMotionAccess(source: MotionPermissionSource): Promise<'granted' | 'denied'> {
  return source.requestPermission ? source.requestPermission.call(source) : Promise.resolve('granted');
}
export function readShakePreference(storage: Pick<Storage, 'getItem'>): boolean {
  try { return storage.getItem('shake-palette') !== 'off'; } catch { return true; }
}
