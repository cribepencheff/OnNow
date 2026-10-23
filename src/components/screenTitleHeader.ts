// The header of My shows and Calendar: the screen's name large and bold,
// as in Apple TV, a quarter smaller than `display` (owner, 2026-10-23),
// at Home's logo's side inset, `header-inset`, rather than the content's
// (owner, 2026-10-23), on bg like the screen under it.

import { HEADER_BAR_HEIGHT } from "@/logic/header";
import { t, type } from "@/theme/tokens";

export const SCREEN_TITLE_SIZE = 26;

// The bar's height under the status bar: Home's, so the title's middle
// sits level with Home's logo (owner, 2026-10-23).
export const SCREEN_TITLE_BAR_HEIGHT = HEADER_BAR_HEIGHT;

// The title's text, also Search's own title (SearchHeader).
export const SCREEN_TITLE_TEXT = {
  fontSize: SCREEN_TITLE_SIZE,
  fontWeight: type.display.fontWeight,
  letterSpacing: type.display.letterSpacing,
  color: t.ink,
};

export function screenTitleHeader(topInset: number) {
  return {
    headerTitleAlign: "left" as const,
    headerTitleContainerStyle: { marginHorizontal: t.headerInset },
    headerTitleStyle: SCREEN_TITLE_TEXT,
    headerStyle: {
      backgroundColor: t.bg,
      height: topInset + SCREEN_TITLE_BAR_HEIGHT,
    },
    headerShadowVisible: false,
  };
}
