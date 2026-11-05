/**
 * Calls `onFound` once as soon as an element matching `selector` exists,
 * immediately if it is already in the DOM. Tour targets such as the anomaly
 * panel only render after the results page has loaded its data, i.e. after
 * the tour step itself is already shown. Returns a cleanup function.
 */
export function whenElementPresent(
  selector: string,
  onFound: (el: HTMLElement) => void,
  root: ParentNode & Node = document,
): () => void {
  const existing = root.querySelector<HTMLElement>(selector);
  if (existing) {
    onFound(existing);
    return () => {};
  }
  const observer = new MutationObserver(() => {
    const el = root.querySelector<HTMLElement>(selector);
    if (!el) return;
    observer.disconnect();
    onFound(el);
  });
  observer.observe(root, { childList: true, subtree: true });
  return () => observer.disconnect();
}

const GAP = 12;

/**
 * Position of the tour tooltip for a target: below it if there is room,
 * otherwise above it. A target that fills most of the viewport (e.g. the
 * expanded anomaly panel) leaves room on neither side; the tooltip then sits
 * at the bottom edge so it covers the target's lower part, not its heading.
 */
export function placeTooltip(
  target: { top: number; bottom: number; left: number },
  tip: { width: number; height: number },
  viewport: { width: number; height: number },
): { top: number; left: number } {
  const below = target.bottom + GAP;
  const above = target.top - GAP - tip.height;
  const top =
    below + tip.height <= viewport.height - GAP ? below
    : above >= GAP ? above
    : Math.max(GAP, viewport.height - tip.height - GAP);
  const left = Math.min(Math.max(target.left, GAP), viewport.width - tip.width - GAP);
  return { top, left };
}
