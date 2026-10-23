// The header of My shows and Calendar: the screen's name large and bold,
// as in Apple TV, a quarter smaller than `display` (owner, 2026-10-23),
// left aligned with the content, on bg like the screen under it.

import { t, type } from "@/theme/tokens";

export const SCREEN_TITLE_SIZE = 26;

// The bar's height under the status bar: the title's line with room
// around it.
export const SCREEN_TITLE_BAR_HEIGHT = 48;

export function screenTitleHeader(topInset: number) {
  return {
    headerTitleAlign: "left" as const,
    headerTitleContainerStyle: { marginHorizontal: t.contentInset },
    headerTitleStyle: {
      fontSize: SCREEN_TITLE_SIZE,
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
