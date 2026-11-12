import { useEffect, useRef, type ReactNode } from 'react';

/** A native modal keeps editor selections intact while the browser manages focus. */
export function EditorSheet({ label, children, onClose }: { label: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  const dragStart = useRef<number | null>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    const close = () => { if (!dialog.open) closeRef.current(); };
    dialog.addEventListener('close', close);
    // Safari doesn't support closedby yet. Both ends must be outside, so
    // selecting text and releasing over the backdrop never dismisses a sheet.
    const outside = (event: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom;
    };
    let pressedOutside = false;
    const down = (event: PointerEvent) => { pressedOutside = outside(event); };
    const up = (event: PointerEvent) => { if (pressedOutside && outside(event)) dialog.close(); pressedOutside = false; };
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      dialog.addEventListener('pointerdown', down);
      dialog.addEventListener('pointerup', up);
    }
    return () => {
      dialog.removeEventListener('close', close);
      dialog.removeEventListener('pointerdown', down);
      dialog.removeEventListener('pointerup', up);
      dialog.close();
    };
  }, []);
  return <dialog ref={ref} className="editor-sheet" aria-label={label} {...{ closedby: 'any' }}>
    <button type="button" className="editor-sheet-grip" aria-label="关闭面板" autoFocus
      onClick={() => ref.current?.close()}
      onPointerDown={event => { dragStart.current = event.clientY; event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerUp={event => { if (dragStart.current !== null && event.clientY - dragStart.current > 40) ref.current?.close(); dragStart.current = null; }}
      onPointerCancel={() => { dragStart.current = null; }}><span /></button>
    {children}
  </dialog>;
}
