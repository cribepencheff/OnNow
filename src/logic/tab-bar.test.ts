import {
  FLOATING_TAB_BAR_BOTTOM,
  FLOATING_TAB_BAR_HEIGHT,
  isWithinScrubBounds,
  nearestTabIndex,
  TAB_BAR_HEIGHT,
  TAB_BAR_SCRUB_CANCEL_SLOP,
  type TabLayout,
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

// Four tabs, 76 wide with 6 between them, as on the real bar.
const FOUR_TABS: TabLayout[] = [
  { x: 0, width: 76 },
  { x: 82, width: 76 },
  { x: 164, width: 76 },
  { x: 246, width: 76 },
];

describe("scrubbing across the tab bar (CRI-133)", () => {
  it("picks the tab whose centre is closest to the finger", () => {
    expect(nearestTabIndex(38, FOUR_TABS)).toBe(0);
    expect(nearestTabIndex(120, FOUR_TABS)).toBe(1);
    expect(nearestTabIndex(202, FOUR_TABS)).toBe(2);
    expect(nearestTabIndex(284, FOUR_TABS)).toBe(3);
  });

  it("picks the nearer tab across the gap between two tabs", () => {
    // The gap's own midpoint, 79, between tab 0 (centre 38) and tab 1
    // (centre 120): still nearer to tab 0.
    expect(nearestTabIndex(79, FOUR_TABS)).toBe(0);
    expect(nearestTabIndex(80, FOUR_TABS)).toBe(1);
  });

  it("clamps to the first and last tab, even far outside the row", () => {
    expect(nearestTabIndex(-500, FOUR_TABS)).toBe(0);
    expect(nearestTabIndex(500, FOUR_TABS)).toBe(3);
  });

  it("skips a tab not yet measured, rather than picking it", () => {
    const withAGap: (TabLayout | undefined)[] = [
      FOUR_TABS[0],
      undefined,
      FOUR_TABS[2],
      FOUR_TABS[3],
    ];
    expect(nearestTabIndex(120, withAGap)).toBe(0);
  });

  it("stays within bounds for a finger over the bar itself", () => {
    expect(isWithinScrubBounds(0)).toBe(true);
    expect(isWithinScrubBounds(FLOATING_TAB_BAR_HEIGHT)).toBe(true);
  });

  it("stays within bounds just past the cancel slop", () => {
    expect(isWithinScrubBounds(-TAB_BAR_SCRUB_CANCEL_SLOP + 1)).toBe(true);
    expect(
      isWithinScrubBounds(
        FLOATING_TAB_BAR_HEIGHT + TAB_BAR_SCRUB_CANCEL_SLOP - 1,
      ),
    ).toBe(true);
  });

  it("cancels once the finger is dragged well outside the bar", () => {
    expect(isWithinScrubBounds(-TAB_BAR_SCRUB_CANCEL_SLOP - 1)).toBe(false);
    expect(
      isWithinScrubBounds(
        FLOATING_TAB_BAR_HEIGHT + TAB_BAR_SCRUB_CANCEL_SLOP + 1,
      ),
    ).toBe(false);
  });
});
