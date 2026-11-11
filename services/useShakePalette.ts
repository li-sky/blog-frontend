import { useEffect, useRef, useState } from 'react';
import { createShakeDetector, hasMotionData, readShakePreference, requestMotionAccess, type MotionPermissionSource } from './shakePalette';

export function useShakePalette(onShake: () => void) {
  const source = typeof DeviceMotionEvent === 'undefined' ? null : DeviceMotionEvent as unknown as MotionPermissionSource;
  const supported = !!source && isSecureContext && (navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches);
  const requiresPermission = !!source?.requestPermission;
  const [optedIn, setOptedIn] = useState(() => readShakePreference(localStorage));
  const [authorized, setAuthorized] = useState(!requiresPermission);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const callback = useRef(onShake); callback.current = onShake;
  const request = useRef(0);
  const enabled = supported && optedIn && authorized;
  const persist = (value: boolean) => { try { localStorage.setItem('shake-palette', value ? 'on' : 'off'); } catch {} };

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== 'shake-palette' && event.key !== null) return;
      request.current++; setPending(false); setMessage(''); setOptedIn(readShakePreference(localStorage));
    };
    window.addEventListener('storage', sync);
    return () => { request.current++; window.removeEventListener('storage', sync); };
  }, []);

  const toggle = async () => {
    if (!supported || pending || !source) return;
    const current = ++request.current;
    setMessage('');
    if (enabled) { setOptedIn(false); persist(false); return; }
    setPending(true);
    try {
      const permission = await requestMotionAccess(source);
      if (request.current !== current) return;
      if (permission !== 'granted') { setOptedIn(false); persist(false); setMessage('未获得运动权限，允许后可再次启用。'); return; }
      setAuthorized(true); setOptedIn(true); persist(true);
    } catch {
      if (request.current === current) { setOptedIn(false); persist(false); setMessage('暂时无法启用，请检查浏览器的运动权限。'); }
    } finally { if (request.current === current) setPending(false); }
  };

  useEffect(() => {
    if (!enabled) return;
    const detector = createShakeDetector();
    let received = false;
    let timeout: number | undefined;
    const waitForData = () => {
      window.clearTimeout(timeout);
      if (!received && document.visibilityState === 'visible') timeout = window.setTimeout(() => setMessage('没有收到运动数据，请检查手机或浏览器的运动权限。'), 6500);
    };
    const motion = (event: DeviceMotionEvent) => {
      if (document.visibilityState !== 'visible') { detector.reset(); return; }
      if (!received && hasMotionData(event)) { received = true; window.clearTimeout(timeout); setMessage(''); }
      if (detector.push(event, performance.now())) callback.current();
    };
    const visibility = () => { detector.reset(); waitForData(); };
    const rotate = () => detector.pause(performance.now());
    waitForData();
    window.addEventListener('devicemotion', motion, { passive: true });
    window.addEventListener('orientationchange', rotate);
    screen.orientation?.addEventListener('change', rotate);
    document.addEventListener('visibilitychange', visibility);
    return () => { window.clearTimeout(timeout); window.removeEventListener('devicemotion', motion); window.removeEventListener('orientationchange', rotate); screen.orientation?.removeEventListener('change', rotate); document.removeEventListener('visibilitychange', visibility); };
  }, [enabled]);

  return { enabled, supported, pending, message, needsPermission: supported && optedIn && !authorized, toggle };
}
