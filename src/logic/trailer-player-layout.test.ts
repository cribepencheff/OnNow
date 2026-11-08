import {
  CLOSE_SIZE,
  trailerPlayerLayout,
  type PlayerLayout,
} from "./trailer-player-layout";

// An iPhone 15: 393 x 852 points; insets 59 at the top and 34 at the
// bottom upright, 59 each side and 21 at the bottom turned.
const UPRIGHT = { width: 393, height: 852 };
const UPRIGHT_INSETS = { top: 59, right: 0, bottom: 34, left: 0 };
const TURNED = { width: 852, height: 393 };
const TURNED_INSETS = { top: 0, right: 59, bottom: 21, left: 59 };
// The "Close" pill is at most this wide.
const PILL_MAX_WIDTH = 120;

function overlaps(layout: PlayerLayout, screenWidth: number): boolean {
  const { video, close } = layout;
  const width = layout.closeLabelled ? PILL_MAX_WIDTH : CLOSE_SIZE;
  const closeLeft = screenWidth - close.right - width;
  return (
    closeLeft < video.left + video.width &&
    closeLeft + width > video.left &&
    close.top < video.top + video.height &&
    close.top + CLOSE_SIZE > video.top
  );
}

// ADR 0021, owner 2026-11-08: the close button never over YouTube's player.
describe("trailerPlayerLayout (ADR 0021)", () => {
  it("upright: the player from under the status bar, a Close pill at the foot on the right", () => {
    const layout = trailerPlayerLayout(UPRIGHT, UPRIGHT_INSETS);
    const closeTop = 852 - 34 - 8 - CLOSE_SIZE;
    expect(layout.closeLabelled).toBe(true);
    expect(layout.close).toEqual({ top: closeTop, right: 16 });
    expect(layout.video).toEqual({
      left: 0,
      top: 59,
      width: 393,
      height: closeTop - 8 - 59,
    });
    expect(overlaps(layout, 393)).toBe(false);
  });

  it("turned: the video the screen's full height, centred, a round button at the top of the right bar", () => {
    const layout = trailerPlayerLayout(TURNED, TURNED_INSETS);
    expect(layout.closeLabelled).toBe(false);
    // Edge to edge in height, as YouTube's own full screen.
    expect(layout.video.top).toBe(0);
    expect(layout.video.height).toBeCloseTo(393);
    expect(layout.video.width).toBeCloseTo(393 * (16 / 9));
    expect(layout.video.left).toBeCloseTo((852 - 393 * (16 / 9)) / 2);
    // Centred in the right bar, clear of the rounded corner.
    const bar = (852 - 393 * (16 / 9)) / 2;
    expect(layout.close.right).toBeCloseTo((bar - CLOSE_SIZE) / 2);
    expect(layout.close.top).toBe(20);
    expect(overlaps(layout, 852)).toBe(false);
  });

  it("turned on a screen too narrow for the bars: the video gives way", () => {
    const layout = trailerPlayerLayout(
      { width: 720, height: 405 },
      { top: 0, right: 0, bottom: 0, left: 0 },
    );
    expect(layout.video.width).toBeCloseTo(720 - 2 * (CLOSE_SIZE + 16));
    expect(overlaps(layout, 720)).toBe(false);
  });
});
