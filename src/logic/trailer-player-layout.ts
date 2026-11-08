// Where the trailer player's video and close button go (ADR 0021, owner
// 2026-11-08). The close button never sits over YouTube's player, its
// title or its controls (YouTube's terms: nothing over the player).
// Upright: the player from under the status bar down to a strip at the
// foot, where a "Close" pill sits on the right, in reach of a thumb.
// Turned: the video the screen's full height, a round close button at the
// top of the black bar to its right (too narrow for words).

export const CLOSE_SIZE = 36;
const MARGIN = 16;
const GAP = 8;
const VIDEO_RATIO = 16 / 9;
// Turned, the button's distance from the top, clear of the screen's
// rounded corner.
const TURNED_CLOSE_TOP = 20;

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PlayerLayout {
  video: Rect;
  // From the screen's top and right edges; its width is its own.
  close: { top: number; right: number };
  // A pill with "Close" upright, a round button turned.
  closeLabelled: boolean;
}

export function trailerPlayerLayout(
  screen: { width: number; height: number },
  insets: Insets,
): PlayerLayout {
  const safeLeft = insets.left;
  const safeRight = screen.width - insets.right;
  const safeTop = insets.top;
  const safeBottom = screen.height - insets.bottom;
  const safeWidth = safeRight - safeLeft;

  if (screen.width < screen.height) {
    const closeTop = safeBottom - GAP - CLOSE_SIZE;
    return {
      video: {
        left: safeLeft,
        top: safeTop,
        width: safeWidth,
        height: closeTop - GAP - safeTop,
      },
      close: { top: closeTop, right: insets.right + MARGIN },
      closeLabelled: true,
    };
  }

  // Turned: the video the screen's full height, edge to edge, as YouTube's
  // own full screen (owner, 2026-11-08: a smaller video lost the feel). A
  // phone is wider than 16:9, so a black bar is left each side; the button
  // sits at the top of the right one, clear of the picture and of the
  // camera's cut-out, which is in the middle of that side. Only on a
  // screen too narrow for the bars does the video give way.
  const bar = CLOSE_SIZE + 2 * GAP;
  const width = Math.min(screen.width - 2 * bar, screen.height * VIDEO_RATIO);
  const height = width / VIDEO_RATIO;
  const left = (screen.width - width) / 2;
  const top = (screen.height - height) / 2;
  const barLeft = left + width;
  const closeLeft = barLeft + (screen.width - barLeft - CLOSE_SIZE) / 2;
  return {
    video: { left, top, width, height },
    close: {
      top: Math.max(safeTop, 0) + TURNED_CLOSE_TOP,
      right: screen.width - closeLeft - CLOSE_SIZE,
    },
    closeLabelled: false,
  };
}
