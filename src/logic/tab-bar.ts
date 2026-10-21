// Where the floating tab bar sits and how much of the screen it covers
// (CRI-133), from the tab bar tokens. Pure, so it can be tested without
// rendering.

import { t } from "@/theme/tokens";

// The floating pill's height: a tab (active and inactive are the same
// size), the bar's padding and its edge.
export const FLOATING_TAB_BAR_HEIGHT =
  t.tabBarTabHeight + 2 * t.tabBarPadding + 2 * t.tabBarEdgeWidth;

// The bar's distance from the bottom of the screen.
export const FLOATING_TAB_BAR_BOTTOM = t.tabBarBottomGap;

// The space the tab bar covers at the bottom of the screen: content ends
// above it (Home's hero and rows, Shows, Calendar, Search's lists).
export const TAB_BAR_HEIGHT = FLOATING_TAB_BAR_BOTTOM + FLOATING_TAB_BAR_HEIGHT;

// A tab's measured place in the bar's row (FloatingTabBar's onLayout),
// used to scrub across the bar (CRI-133).
export interface TabLayout {
  x: number;
  width: number;
}

// Scrubbing (CRI-133, iOS tab bar style): the tab under the finger, from
// its x position in the row, as the closest tab centre. Closest-centre
// rather than a plain x / tabWidth division so it still holds up against
// the gap between tabs and any future unequal tab width. A worklet so the
// pan gesture can call it on the UI thread without a JS round trip.
export function nearestTabIndex(
  x: number,
  layouts: readonly (TabLayout | undefined)[],
): number {
  "worklet";
  let nearest = 0;
  let nearestDistance = Infinity;
  for (let index = 0; index < layouts.length; index += 1) {
    const layout = layouts[index];
    if (!layout) {
      continue;
    }
    const distance = Math.abs(x - (layout.x + layout.width / 2));
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = index;
    }
  }
  return nearest;
}

// Scrubbing: a finger dragged this far above or below the bar, then
// released, cancels the selection rather than committing whatever tab it
// last crossed (CRI-133).
export const TAB_BAR_SCRUB_CANCEL_SLOP = 60;

export function isWithinScrubBounds(y: number): boolean {
  "worklet";
  return (
    y > -TAB_BAR_SCRUB_CANCEL_SLOP &&
    y < FLOATING_TAB_BAR_HEIGHT + TAB_BAR_SCRUB_CANCEL_SLOP
  );
}
