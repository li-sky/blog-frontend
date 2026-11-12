import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check, Moon, Monitor, Smartphone, Sun, X } from 'lucide-react';
import { applyAppearance, isDarkMode, nextTheme, paletteLongPress, palettes, readAppearance, type ThemeMode } from '../services/appearance';
import { randomOtherPalette } from '../services/shakePalette';
import { useShakePalette } from '../services/useShakePalette';
import './theme-controls.css';

export function ThemeControls() {
  const [appearance, setAppearance] = useState(() => readAppearance(localStorage));
  const [systemDark, setSystemDark] = useState(() => matchMedia('(prefers-color-scheme: dark)').matches);
  const [open, setOpen] = useState(false);
  const [holding, setHolding] = useState(false);
  const [shakeToast, setShakeToast] = useState('');
  const appearanceRef = useRef(appearance); appearanceRef.current = appearance;
  const toastTimer = useRef<number | undefined>(undefined);
  const shake = useShakePalette(() => {
    const next = { ...appearanceRef.current, palette: randomOtherPalette(appearanceRef.current.palette) };
    appearanceRef.current = next; setAppearance(next);
    setShakeToast(`摇到了 ${palettes.find(palette => palette.id === next.palette)!.name}`);
    window.clearTimeout(toastTimer.current); toastTimer.current = window.setTimeout(() => setShakeToast(''), 2200);
    try { navigator.vibrate?.(18); } catch {}
  });
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const gesture = useMemo(() => paletteLongPress(() => setOpen(true), undefined, setHolding), []);
  const dark = isDarkMode(appearance.mode, systemDark);
  useLayoutEffect(() => {
    applyAppearance(document.documentElement, appearance, systemDark);
    try { localStorage.setItem('theme', appearance.mode); localStorage.setItem('color-palette', appearance.palette); } catch {}
  }, [appearance, systemDark]);
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(media.matches);
    const sync = (event: StorageEvent) => { if (event.key === 'theme' || event.key === 'color-palette' || event.key === null) setAppearance(readAppearance(localStorage)); };
    media.addEventListener('change', update); window.addEventListener('storage', sync); window.addEventListener('blur', gesture.cancel);
    return () => { media.removeEventListener('change', update); window.removeEventListener('storage', sync); window.removeEventListener('blur', gesture.cancel); gesture.cancel(); };
  }, [gesture]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const overflow = document.body.style.overflow;
    dialog.showModal(); document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; toggleRef.current?.focus({ preventScroll: true }); };
  }, [open]);
  const modes: { value: ThemeMode; name: string; icon: React.ReactNode }[] = [{ value: 'light', name: '浅色', icon: <Sun size={16} /> }, { value: 'dark', name: '深色', icon: <Moon size={16} /> }, { value: 'system', name: '跟随系统', icon: <Monitor size={16} /> }];
  const currentMode = modes.find(item => item.value === appearance.mode)!;
  return <>
    <button ref={toggleRef} type="button" className="theme-toggle" data-holding={holding || undefined} aria-label={`切换明暗模式，当前${currentMode.name}；长按或右键选择配色`} title={`当前${currentMode.name} · 长按或右键选择配色`} aria-haspopup="dialog" aria-expanded={open} aria-controls="palette-dialog"
      onClick={event => { if (gesture.consumeClick()) { event.preventDefault(); return; } setAppearance(current => ({ ...current, mode: nextTheme(current.mode, systemDark) })); }}
      onContextMenu={event => { event.preventDefault(); if (gesture.isHolding()) return; gesture.cancel(); setOpen(true); }}
      onPointerDown={event => { if (event.button === 0) gesture.start(event.pointerType, event.clientX, event.clientY); }}
      onPointerMove={event => gesture.move(event.clientX, event.clientY)} onPointerUp={gesture.cancel} onPointerCancel={gesture.cancel} onPointerLeave={gesture.cancel}
      onKeyDown={event => { if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) { event.preventDefault(); setOpen(true); } }}>
      {appearance.mode === 'light' ? <Sun size={24} /> : appearance.mode === 'dark' ? <Moon size={24} /> : <Monitor size={24} />}
      <svg className="theme-hold-ring" viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="33" fill="none" stroke="currentColor" strokeWidth="2" pathLength="100" strokeDasharray="100" strokeDashoffset="100" /></svg>
    </button>
    {shakeToast && !open && <div className="palette-shake-toast" role="status"><Smartphone size={16} />{shakeToast}</div>}
    <dialog id="palette-dialog" ref={dialogRef} className="palette-dialog" aria-labelledby="palette-heading" onCancel={event => { event.preventDefault(); setOpen(false); }} onClick={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="palette-panel">
        <header><div><h2 id="palette-heading">配色</h2><p>选择喜欢的编辑器色调</p></div><button type="button" className="palette-close" aria-label="关闭配色设置" onClick={() => setOpen(false)}><X size={20} /></button></header>
        <div className="palette-modes" role="group" aria-label="明暗模式">{modes.map(mode => <button key={mode.value} type="button" aria-pressed={appearance.mode === mode.value} onClick={() => setAppearance(current => ({ ...current, mode: mode.value }))}>{mode.icon}{mode.name}</button>)}</div>
        <div className="palette-shake"><div><strong><Smartphone size={16} />摇一摇换配色</strong><p role="status">{shake.message || shakeToast || (shake.needsPermission ? '允许运动权限后，即可摇动换配色' : shake.supported ? '晃动手机，随机换一种配色' : '请在支持运动感应的手机上启用')}</p></div><button type="button" role="switch" aria-label="摇一摇换配色" aria-checked={shake.enabled} disabled={!shake.supported || shake.pending} onClick={() => void shake.toggle()}>{shake.pending ? '授权中…' : shake.enabled ? '已开启' : shake.needsPermission ? '授权启用' : '启用'}</button></div>
        <div className="palette-grid" role="radiogroup" aria-label="编辑器配色">{palettes.map(palette => {
          const colors = dark ? palette.dark : palette.light;
          return <label className="palette-option" key={palette.id}>
            <input type="radio" name="color-palette" value={palette.id} checked={appearance.palette === palette.id} onChange={() => setAppearance(current => ({ ...current, palette: palette.id }))} aria-label={palette.name} />
            <span className="palette-tile"><span className="palette-preview" style={{ background: colors.canvas, color: colors.text }} aria-hidden="true"><span className="palette-dots"><i style={{ background: colors.keyword }} /><i style={{ background: colors.string }} /><i style={{ background: colors.number }} /></span><span><b style={{ color: colors.text }}>const </b><b style={{ color: colors.text }}>color</b> = <b style={{ color: colors.text }}>'hello'</b></span><span className="palette-preview-line" style={{ background: colors.border }} /></span><span className="palette-name">{palette.name}{appearance.palette === palette.id && <Check size={16} aria-hidden="true" />}</span><small>{palette.description}</small></span>
          </label>;
        })}</div>
        <footer><span>自动保存，下次沿用</span></footer>
      </section>
    </dialog>
  </>;
}
