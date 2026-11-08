// Where the trailer player's video and close button go (ADR 0021, owner
// 2026-11-08). YouTube's player gets a 16:9 box of its own, and the close
// button sits in the black outside it, never over YouTube's player, its
// title or its controls (YouTube's terms: nothing over the player).
// Upright: the button under the status bar, and the player filling the
// screen below it to the safe area's foot, so YouTube's title starts under
// the button and its controls sit above the home indicator (owner,
// 2026-11-08). Turned: a column each side of the video, inside the safe
// area, the button at the top of the right one; the video as large as
// that leaves.

export const CLOSE_SIZE = 36;
const MARGIN = 16;
const BELOW_STATUS_BAR = 8;
const BELOW_BUTTON = 8;
const VIDEO_RATIO = 16 / 9;

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
  close: { left: number; top: number };
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
  const safeHeight = safeBottom - safeTop;

  if (screen.width < screen.height) {
    const closeTop = insets.top + BELOW_STATUS_BAR;
    const top = closeTop + CLOSE_SIZE + BELOW_BUTTON;
    return {
      video: {
        left: safeLeft,
        top,
        width: safeWidth,
        height: safeBottom - top,
      },
      close: { left: safeRight - MARGIN - CLOSE_SIZE, top: closeTop },
    };
  }

  // A column for the button each side, so the video stays centred.
  const column = CLOSE_SIZE + 2 * MARGIN;
  const width = Math.min(safeWidth - 2 * column, safeHeight * VIDEO_RATIO);
  const height = width / VIDEO_RATIO;
  const left = safeLeft + (safeWidth - width) / 2;
  const top = safeTop + (safeHeight - height) / 2;
  const rightColumnLeft = left + width;
  return {
    video: { left, top, width, height },
    close: {
      left: rightColumnLeft + (safeRight - rightColumnLeft - CLOSE_SIZE) / 2,
      top: safeTop + MARGIN,
    },
  };
}
