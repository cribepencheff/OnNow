import {
  screenTitleHeader,
  SCREEN_TITLE_BAR_HEIGHT,
  SCREEN_TITLE_SIZE,
} from "./screenTitleHeader";
import { t, type } from "@/theme/tokens";

// Owner, 2026-10-23: My shows' and Calendar's titles as Apple TV's: iOS's
// large title, left aligned with the content.
describe("screenTitleHeader", () => {
  // Owner, 2026-10-23: a quarter smaller than display (34) read better.
  it("sets the title a quarter smaller than display, bold, ink, left aligned with the content", () => {
    const options = screenTitleHeader(47);
    expect(options.headerTitleStyle).toMatchObject({
      fontSize: SCREEN_TITLE_SIZE,
      fontWeight: type.display.fontWeight,
      color: t.ink,
    });
    expect(options.headerTitleAlign).toBe("left");
    expect(options.headerTitleContainerStyle).toEqual({
      marginHorizontal: t.contentInset,
    });
  });

  it("makes the bar tall enough for it, under the status bar, on bg with no shadow", () => {
    const options = screenTitleHeader(47);
    expect(options.headerStyle).toEqual({
      backgroundColor: t.bg,
      height: 47 + SCREEN_TITLE_BAR_HEIGHT,
    });
    expect(SCREEN_TITLE_SIZE).toBe(Math.round(type.display.fontSize * 0.75));
    expect(SCREEN_TITLE_BAR_HEIGHT).toBeGreaterThan(SCREEN_TITLE_SIZE + 16);
    expect(options.headerShadowVisible).toBe(false);
  });
});
