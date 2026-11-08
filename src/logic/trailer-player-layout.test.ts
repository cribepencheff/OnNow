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

function overlaps(layout: PlayerLayout): boolean {
  const { video, close } = layout;
  return (
    close.left < video.left + video.width &&
    close.left + CLOSE_SIZE > video.left &&
    close.top < video.top + video.height &&
    close.top + CLOSE_SIZE > video.top
  );
}

// ADR 0021, owner 2026-11-08: the close button never over YouTube's player.
describe("trailerPlayerLayout (ADR 0021)", () => {
  it("upright: the button under the status bar, the player filling the screen below it to the safe area's foot", () => {
    const layout = trailerPlayerLayout(UPRIGHT, UPRIGHT_INSETS);
    expect(layout.close).toEqual({ left: 393 - 16 - CLOSE_SIZE, top: 67 });
    // Starts under the button, so YouTube's title is not under it.
    expect(layout.video).toEqual({
      left: 0,
      top: 67 + CLOSE_SIZE + 8,
      width: 393,
      height: 852 - 34 - (67 + CLOSE_SIZE + 8),
    });
    expect(overlaps(layout)).toBe(false);
  });

  it("turned: the video centred between two columns, the button at the top of the right one", () => {
    const layout = trailerPlayerLayout(TURNED, TURNED_INSETS);
    const safeWidth = 852 - 59 - 59;
    const column = CLOSE_SIZE + 32;
    expect(layout.video.width).toBeCloseTo(safeWidth - 2 * column);
    expect(layout.video.height).toBeCloseTo(layout.video.width / (16 / 9));
    // Centred in the safe area.
    expect(layout.video.left).toBeCloseTo(59 + column);
    expect(layout.close.top).toBe(16);
    // Centred in the right column, inside the safe area.
    expect(layout.close.left).toBeCloseTo(
      layout.video.left + layout.video.width + 16,
    );
    expect(layout.close.left + CLOSE_SIZE).toBeLessThanOrEqual(852 - 59);
    expect(overlaps(layout)).toBe(false);
  });

  it("turned on a screen with room to spare: no taller than the safe area", () => {
    const layout = trailerPlayerLayout(
      { width: 1400, height: 400 },
      { top: 0, right: 0, bottom: 0, left: 0 },
    );
    expect(layout.video.height).toBeCloseTo(400);
    expect(overlaps(layout)).toBe(false);
  });
});
