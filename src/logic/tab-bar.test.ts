import {
  FLOATING_TAB_BAR_BOTTOM,
  FLOATING_TAB_BAR_HEIGHT,
  TAB_BAR_HEIGHT,
} from "./tab-bar";

describe("floating tab bar position (CRI-133)", () => {
  it("covers the same 83 at the bottom of the screen as the old bar", () => {
    expect(TAB_BAR_HEIGHT).toBe(83);
    expect(FLOATING_TAB_BAR_BOTTOM + FLOATING_TAB_BAR_HEIGHT).toBe(
      TAB_BAR_HEIGHT,
    );
  });

  it("floats clear of the home indicator", () => {
    // The home indicator ends about 13 above the bottom of the screen.
    expect(FLOATING_TAB_BAR_BOTTOM).toBeGreaterThanOrEqual(16);
  });

  it("is the active tab's 46 plus 7 padding and a 0.5 edge on each side", () => {
    expect(FLOATING_TAB_BAR_HEIGHT).toBe(61);
  });
});
