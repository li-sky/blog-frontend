import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { Download, X } from 'lucide-react';

interface PostImageViewerProps {
  previewSrc: string;
  originalSrc: string;
  alt: string;
  onClose: () => void;
}

interface Point {
  x: number;
  y: number;
}

interface View extends Point {
  scale: number;
}

const fit: View = { scale: 1, x: 0, y: 0 };
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const midpoint = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export function PostImageViewer({ previewSrc, originalSrc, alt, onClose }: PostImageViewerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const pointers = useRef(new Map<number, { position: Point; start: Point }>());
  const moved = useRef(false);
  const closing = useRef(false);
  const viewRef = useRef(fit);
  const [view, setView] = useState(fit);
  const [useOriginal, setUseOriginal] = useState(false);

  const updateView = useCallback((next: View) => {
    const stage = stageRef.current;
    const image = imageRef.current;
    if (!stage || !image) return;
    const maxX = Math.max(0, (image.offsetWidth * next.scale - stage.clientWidth) / 2);
    const maxY = Math.max(0, (image.offsetHeight * next.scale - stage.clientHeight) / 2);
    const bounded = { scale: next.scale, x: clamp(next.x, -maxX, maxX), y: clamp(next.y, -maxY, maxY) };
    const current = viewRef.current;
    if (current.scale === bounded.scale && current.x === bounded.x && current.y === bounded.y) return;
    viewRef.current = bounded;
    setView(bounded);
  }, []);

  const zoom = useCallback((factor: number, from: Point, to = from) => {
    const bounds = stageRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const current = viewRef.current;
    const scale = clamp(current.scale * factor, 1, 6);
    if (scale === 1) {
      updateView(fit);
      return;
    }
    // Keep the same part of the image under the pointer or pinch midpoint.
    const ratio = scale / current.scale;
    const center = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
    updateView({
      scale,
      x: to.x - center.x - (from.x - center.x - current.x) * ratio,
      y: to.y - center.y - (from.y - center.y - current.y) * ratio,
    });
  }, [updateView]);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const image = imageRef.current;
    if (!stage || !image) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientHeight : 1;
      const delta = clamp(event.deltaY * unit, -250, 250);
      zoom(Math.exp(-delta * (event.ctrlKey ? 0.01 : 0.002)), { x: event.clientX, y: event.clientY });
    };
    // React's wheel listener is passive, so register this scoped listener directly.
    stage.addEventListener('wheel', onWheel, { passive: false });
    const observer = new ResizeObserver(() => updateView(viewRef.current));
    observer.observe(stage);
    observer.observe(image);
    return () => {
      stage.removeEventListener('wheel', onWheel);
      observer.disconnect();
    };
  }, [updateView, zoom]);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    const active = pointers.current;
    if (event.button !== 0 || active.size >= 2) return;
    if (active.size === 0) moved.current = false;
    const position = { x: event.clientX, y: event.clientY };
    active.set(event.pointerId, { position, start: position });
    if (active.size === 2) moved.current = true;
    (event.target as Element).setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const active = pointers.current;
    const previous = active.get(event.pointerId);
    if (!previous) return;
    const position = { x: event.clientX, y: event.clientY };
    active.set(event.pointerId, { ...previous, position });
    if (distance(previous.start, position) > 6) moved.current = true;

    if (active.size === 2) {
      const other = [...active.entries()].find(([id]) => id !== event.pointerId)?.[1].position;
      if (!other) return;
      const before = Math.max(1, distance(previous.position, other));
      zoom(distance(position, other) / before, midpoint(previous.position, other), midpoint(position, other));
    } else if (viewRef.current.scale > 1) {
      const current = viewRef.current;
      updateView({
        scale: current.scale,
        x: current.x + position.x - previous.position.x,
        y: current.y + position.y - previous.position.y,
      });
    }
  }

  function finishPointer(event: PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
  }

  function requestClose() {
    if (closing.current) return;
    closing.current = true;
    onClose();
  }

  const buttonClass = 'inline-flex h-11 items-center justify-center gap-2 rounded-full bg-surface/10 px-3 text-sm text-white hover:bg-surface/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-label="查看大图"
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-hidden border-0 bg-black/95 p-0 text-white"
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
    >
      <div
        className="flex h-full flex-col"
        style={{
          paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
          paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
          paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
          paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
        }}
      >
        <header className="flex shrink-0 items-center justify-end gap-2 pb-2">
          <a href={originalSrc} download className={buttonClass} aria-label="下载原图">
            <Download size={20} aria-hidden="true" />
            <span className="hidden sm:inline">下载原图</span>
          </a>
          <button ref={closeRef} type="button" className={buttonClass} aria-label="关闭大图" onClick={requestClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <div
          ref={stageRef}
          className="flex min-h-0 flex-1 touch-none select-none items-center justify-center overflow-hidden"
          onClick={(event) => {
            if (event.target === event.currentTarget && !moved.current) requestClose();
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishPointer}
          onPointerCancel={finishPointer}
          onLostPointerCapture={finishPointer}
        >
          <img
            ref={imageRef}
            src={useOriginal ? originalSrc : previewSrc}
            alt={alt}
            draggable={false}
            className={`block max-h-full max-w-full rounded-none object-contain ${view.scale > 1 ? 'cursor-grab active:cursor-grabbing' : ''}`}
            style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
            onError={() => setUseOriginal(true)}
          />
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
