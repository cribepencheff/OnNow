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

// The gap between tabs that makes the whole bar (its padding and edge,
// the tabs, and the gaps between them) span exactly windowWidth minus
// contentInset on each side, the same margins the hero's "Open in"
// button sits inside (it stretches to that width by default flex
// behaviour, with no explicit width of its own): visual balance between
// the bar and Home's own big CTA (owner's request), rather than the
// bar's previous fixed, narrower width. Tab count stays fixed (4, today);
// only the gap between them grows or shrinks, not the tabs themselves,
// so icon size and touch targets never change. Never below tabBarGap:
// a very narrow screen keeps that floor instead of crowding the tabs
// together, falling short of the target width rather than past it.
export function tabBarRowGap(windowWidth: number, tabCount: number): number {
  if (tabCount <= 1) {
    return t.tabBarGap;
  }
  const targetWidth = windowWidth - 2 * t.contentInset;
  const chrome = 2 * (t.tabBarPadding + t.tabBarEdgeWidth);
  const availableForGaps = targetWidth - chrome - tabCount * t.tabBarTabWidth;
  return Math.max(t.tabBarGap, availableForGaps / (tabCount - 1));
}

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
