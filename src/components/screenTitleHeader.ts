// The header of My shows and Calendar: the screen's name as iOS's large
// title, as in Apple TV (owner, 2026-10-23), in `display`, left aligned
// with the content, on bg like the screen under it.

import { t, type } from "@/theme/tokens";

// The bar's height under the status bar: the title's line with room
// around it.
export const SCREEN_TITLE_BAR_HEIGHT = 60;

export function screenTitleHeader(topInset: number) {
  return {
    headerTitleAlign: "left" as const,
    headerTitleContainerStyle: { marginHorizontal: t.contentInset },
    headerTitleStyle: {
      fontSize: type.display.fontSize,
      fontWeight: type.display.fontWeight,
      letterSpacing: type.display.letterSpacing,
      color: t.ink,
    },
    headerStyle: {
      backgroundColor: t.bg,
      height: topInset + SCREEN_TITLE_BAR_HEIGHT,
    },
    headerShadowVisible: false,
  };
}
