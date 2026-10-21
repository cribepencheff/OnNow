import {
  FLOATING_TAB_BAR_BOTTOM,
  FLOATING_TAB_BAR_HEIGHT,
  nearestTabIndex,
  TAB_BAR_HEIGHT,
  type TabLayout,
} from "./tab-bar";

describe("floating tab bar size and position (CRI-133)", () => {
  it("is a 52 tab plus 3.5 padding and a 0.5 edge on each side", () => {
    expect(FLOATING_TAB_BAR_HEIGHT).toBe(60);
  });

  it("floats clear of the home indicator", () => {
    // The home indicator ends about 13 above the bottom of the screen.
    expect(FLOATING_TAB_BAR_BOTTOM).toBeGreaterThanOrEqual(16);
  });

  it("covers its own height and the gap under it, so content ends above it", () => {
    expect(TAB_BAR_HEIGHT).toBe(
      FLOATING_TAB_BAR_BOTTOM + FLOATING_TAB_BAR_HEIGHT,
    );
    expect(TAB_BAR_HEIGHT).toBe(80);
  });
});

// Four tabs, 74 wide with 6 between them, as on the real bar.
const FOUR_TABS: TabLayout[] = [
  { x: 0, width: 74 },
  { x: 80, width: 74 },
  { x: 160, width: 74 },
  { x: 240, width: 74 },
];

describe("scrubbing across the tab bar (CRI-133)", () => {
  it("picks the tab whose centre is closest to the finger", () => {
    expect(nearestTabIndex(37, FOUR_TABS)).toBe(0);
    expect(nearestTabIndex(117, FOUR_TABS)).toBe(1);
    expect(nearestTabIndex(197, FOUR_TABS)).toBe(2);
    expect(nearestTabIndex(277, FOUR_TABS)).toBe(3);
  });

  it("picks the nearer tab across the gap between two tabs", () => {
    // The gap's own midpoint, 77, between tab 0 (centre 37) and tab 1
    // (centre 117): still nearer to tab 0.
    expect(nearestTabIndex(77, FOUR_TABS)).toBe(0);
    expect(nearestTabIndex(78, FOUR_TABS)).toBe(1);
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
    expect(nearestTabIndex(100, withAGap)).toBe(0);
  });
});
