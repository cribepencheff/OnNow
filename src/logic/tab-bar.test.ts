import {
  FLOATING_TAB_BAR_BOTTOM,
  FLOATING_TAB_BAR_HEIGHT,
  TAB_BAR_HEIGHT,
} from "./tab-bar";

describe("floating tab bar size and position (CRI-133)", () => {
  it("is a 54 tab plus 7 padding and a 0.5 edge on each side", () => {
    expect(FLOATING_TAB_BAR_HEIGHT).toBe(69);
  });

  it("floats clear of the home indicator", () => {
    // The home indicator ends about 13 above the bottom of the screen.
    expect(FLOATING_TAB_BAR_BOTTOM).toBeGreaterThanOrEqual(16);
  });

  it("covers its own height and the gap under it, so content ends above it", () => {
    expect(TAB_BAR_HEIGHT).toBe(
      FLOATING_TAB_BAR_BOTTOM + FLOATING_TAB_BAR_HEIGHT,
    );
    expect(TAB_BAR_HEIGHT).toBe(89);
  });
});
