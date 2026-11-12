/** Animate Crepe's existing caret without changing the browser selection or IME. */
export function attachSmoothCaret(root: HTMLElement) {
  if (!Element.prototype.animate || !CSS.supports('translate', '1px 1px')) return () => {};

  const motion = window.matchMedia('(prefers-reduced-motion: no-preference) and (pointer: fine)');
  let previous: { cursor: HTMLElement; left: number; top: number } | null = null;
  let animation: Animation | undefined;
  let composing = false;
  let keyboard = false;

  const reset = () => {
    animation?.cancel();
    animation = undefined;
    previous = null;
  };
  const onPointer = () => { keyboard = false; reset(); };
  const onKey = (event: KeyboardEvent) => {
    keyboard = !event.isComposing && !event.metaKey && !event.ctrlKey && !event.altKey;
  };
  const onCompositionStart = () => { composing = true; reset(); };
  const onCompositionEnd = () => { composing = false; reset(); };

  const observer = new MutationObserver(records => {
    if (previous && !root.contains(previous.cursor)) reset();
    const cursor = records.map(record => record.target).find((target): target is HTMLElement =>
      target instanceof HTMLElement && target.classList.contains('prosemirror-virtual-cursor'));
    if (!cursor || !root.contains(cursor)) return;
    const left = Number.parseFloat(cursor.style.left);
    const top = Number.parseFloat(cursor.style.top);
    if (!Number.isFinite(left) || !Number.isFinite(top)) return;
    if (previous?.cursor === cursor && previous.left === left && previous.top === top) return;

    const last = previous;
    previous = { cursor, left, top };
    const selection = root.ownerDocument.getSelection();
    if (!motion.matches || !keyboard || composing || root.ownerDocument.activeElement !== root
      || !selection?.isCollapsed || !last || last.cursor !== cursor) {
      animation?.cancel();
      animation = undefined;
      return;
    }

    const style = getComputedStyle(cursor);
    // Resource-card source uses its native caret; never animate the hidden one.
    if (style.visibility === 'hidden' || style.display === 'none') { reset(); return; }
    // Continue from the displayed position when typing outruns the animation.
    const offset = style.translate === 'none' ? [0, 0] : style.translate.split(' ').map(Number.parseFloat);
    const dx = last.left + offset[0] - left;
    const dy = last.top + (offset[1] || 0) - top;
    animation?.cancel();
    animation = undefined;
    // Snap across wrapped lines and distant jumps rather than sweeping over text.
    if (Math.abs(dx) > 120 || Math.abs(dy) > cursor.offsetHeight * 2) return;
    animation = cursor.animate([
      // Snappy: cover most of the distance immediately, then gently settle.
      { translate: `${dx * .35}px ${dy * .35}px` },
      { translate: '0px 0px' },
    ], { duration: 100, easing: 'cubic-bezier(.16,1,.3,1)' });
  });
  observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['style'] });
  root.addEventListener('keydown', onKey);
  root.addEventListener('pointerdown', onPointer);
  root.addEventListener('compositionstart', onCompositionStart);
  root.addEventListener('compositionend', onCompositionEnd);
  root.addEventListener('focusout', reset);
  root.ownerDocument.addEventListener('scroll', reset, true);
  motion.addEventListener('change', reset);

  return () => {
    observer.disconnect();
    reset();
    root.removeEventListener('keydown', onKey);
    root.removeEventListener('pointerdown', onPointer);
    root.removeEventListener('compositionstart', onCompositionStart);
    root.removeEventListener('compositionend', onCompositionEnd);
    root.removeEventListener('focusout', reset);
    root.ownerDocument.removeEventListener('scroll', reset, true);
    motion.removeEventListener('change', reset);
  };
}
