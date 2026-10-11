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
