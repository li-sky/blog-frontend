/** Animate Crepe's existing caret without changing the browser selection or IME. */
export function attachSmoothCaret(root: HTMLElement) {
  if (!Element.prototype.animate || !CSS.supports('translate', '1px 1px')) return () => {};

  // Touch editing uses the same virtual caret; keep native selection and IME
  // handling intact instead of disabling the visual effect by pointer type.
  const motion = window.matchMedia('(prefers-reduced-motion: no-preference)');
  let previous: { cursor: HTMLElement; left: number; top: number } | null = null;
  let animation: Animation | undefined;
  let composing = false;

  const reset = () => {
    animation?.cancel();
    animation = undefined;
    previous = null;
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
    if (!motion.matches || composing || root.ownerDocument.activeElement !== root
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
    // Keep the whole path continuous, including clicks, Enter and line wrapping.
    // Short moves stay responsive; longer moves get a little more settling time.
    const duration = 90 + Math.min(70, Math.hypot(dx, dy) * .12);
    animation = cursor.animate([
      { translate: `${dx}px ${dy}px` },
      { translate: '0px 0px' },
    ], { duration, easing: 'cubic-bezier(.22,1,.36,1)' });
  });
  observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['style'] });
  root.addEventListener('compositionstart', onCompositionStart);
  root.addEventListener('compositionend', onCompositionEnd);
  root.addEventListener('focusout', reset);
  motion.addEventListener('change', reset);

  return () => {
    observer.disconnect();
    reset();
    root.removeEventListener('compositionstart', onCompositionStart);
    root.removeEventListener('compositionend', onCompositionEnd);
    root.removeEventListener('focusout', reset);
    motion.removeEventListener('change', reset);
  };
}
