import { useEffect, useRef } from 'react';
import { Bold, Italic, Link2 } from 'lucide-react';
import type { EditorSelectionState } from './CrepeEditor';

export function EditorSelectionTools({ selection, onFormat, onLink, onFocusChange }: { selection: EditorSelectionState; onFormat: (kind: 'bold' | 'italic') => void; onLink: () => void; onFocusChange: (focused: boolean) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if ('focusGroup' in HTMLElement.prototype) return;
    const bar = ref.current!;
    const items = Array.from(bar.querySelectorAll('button'));
    items.forEach((item, i) => { item.tabIndex = i ? -1 : 0; });
    const focus = (event: FocusEvent) => { items.forEach(item => { item.tabIndex = item === event.target ? 0 : -1; }); };
    const key = (event: KeyboardEvent) => {
      const i = items.indexOf(document.activeElement as HTMLButtonElement);
      const rtl = getComputedStyle(bar).direction === 'rtl';
      const step = event.key === 'ArrowRight' ? rtl ? -1 : 1 : event.key === 'ArrowLeft' ? rtl ? 1 : -1 : 0;
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : step ? (i + step + items.length) % items.length : -1;
      if (next >= 0) { event.preventDefault(); items[next].focus(); }
    };
    bar.addEventListener('focusin', focus); bar.addEventListener('keydown', key);
    return () => { bar.removeEventListener('focusin', focus); bar.removeEventListener('keydown', key); };
  }, []);
  return <div ref={ref} className="post-editor-selection" role="toolbar" aria-label="选中文字格式" {...{ focusgroup: 'toolbar wrap' }} onPointerDown={event => event.preventDefault()}
    onFocus={() => onFocusChange(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onFocusChange(false); }}>
    <div role="group" aria-label="文字格式">
      <button type="button" title="粗体" aria-label="粗体" aria-pressed={selection.bold} onClick={() => onFormat('bold')}><Bold size={17} aria-hidden="true" /></button>
      <button type="button" title="斜体" aria-label="斜体" aria-pressed={selection.italic} onClick={() => onFormat('italic')}><Italic size={17} aria-hidden="true" /></button>
      <button type="button" title="添加链接" aria-label="为选区添加链接" onClick={onLink}><Link2 size={17} aria-hidden="true" /></button>
    </div>
  </div>;
}
