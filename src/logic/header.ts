// The header over a screen's top (components/Header.tsx), Apple TV style
// (CRI-124). Pure, so the scroll behaviour can be tested without
// rendering.

// The bar under the status bar that holds the left and right slots: room
// above and below a 20pt logo, so it is not tight under the status bar.
export const HEADER_BAR_HEIGHT = 56;
// The strongest blur, reached as the header leaves the screen.
export const HEADER_MAX_BLUR = 40;

// How far the header has gone, 0 at rest to 1 once scrolled past: it
// leaves with the content, so it is gone after its own height. A pull
// (a negative offset) keeps it at rest: it stays put while the content is
// pulled down.
export function headerScrollProgress(
  scrollOffset: number,
  headerHeight: number,
): number {
  if (headerHeight <= 0) {
    return 0;
  }
  return Math.min(Math.max(scrollOffset / headerHeight, 0), 1);
}

// The blur over the header's slots, growing as it leaves (whole numbers,
// so a slow scroll does not redraw it for nothing).
export function headerBlurIntensity(progress: number): number {
  return Math.round(HEADER_MAX_BLUR * progress);
}
