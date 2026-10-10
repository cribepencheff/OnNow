// Where the floating tab bar sits (CRI-133). Content still clears the same
// 83 at the bottom of the screen as under the old full-width bar, so Home's
// hero, Shows and Calendar keep their layout.

import { t } from "@/theme/tokens";

// The space the tab bar covers at the bottom of the screen: content ends
// above it (Home's rows, Shows, Calendar, Search's lists).
export const TAB_BAR_HEIGHT = 83;

// The active tab's vertical padding, around its icon on the wide pill;
// inactive tabs have 8.
export const ACTIVE_TAB_PADDING_VERTICAL = 9;

// The floating pill's height: the tallest tab (the active one), the bar's
// padding and its edge.
export const FLOATING_TAB_BAR_HEIGHT =
  t.tabBarIconSize +
  2 * ACTIVE_TAB_PADDING_VERTICAL +
  2 * t.tabBarPadding +
  2 * t.tabBarEdgeWidth;

// The bar's distance from the bottom of the screen: its top lines up with
// the top of the space it covers, so it floats over the home indicator's
// area, as Instagram's does.
export const FLOATING_TAB_BAR_BOTTOM = TAB_BAR_HEIGHT - FLOATING_TAB_BAR_HEIGHT;
