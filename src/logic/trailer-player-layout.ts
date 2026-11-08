// Where the trailer player's video and close button go (ADR 0021, owner
// 2026-11-08). The close button never sits over YouTube's player, its
// title or its controls (YouTube's terms: nothing over the player).
// Upright: the player from under the status bar down to a strip at the
// foot, where a "Close" pill sits on the right, in reach of a thumb.
// Turned: a column each side of a 16:9 video, inside the safe area, a
// round close button at the top of the right one (too narrow for words);
// the video as large as that leaves.

export const CLOSE_SIZE = 36;
const MARGIN = 16;
const GAP = 8;
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
  const safeHeight = safeBottom - safeTop;

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

  // A column for the button each side, so the video stays centred.
  const column = CLOSE_SIZE + 2 * MARGIN;
  const width = Math.min(safeWidth - 2 * column, safeHeight * VIDEO_RATIO);
  const height = width / VIDEO_RATIO;
  const left = safeLeft + (safeWidth - width) / 2;
  const top = safeTop + (safeHeight - height) / 2;
  const rightColumnLeft = left + width;
  const closeLeft =
    rightColumnLeft + (safeRight - rightColumnLeft - CLOSE_SIZE) / 2;
  return {
    video: { left, top, width, height },
    close: {
      top: safeTop + MARGIN,
      right: screen.width - closeLeft - CLOSE_SIZE,
    },
    closeLabelled: false,
  };
}
