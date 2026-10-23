import {
  screenTitleHeader,
  SCREEN_TITLE_BAR_HEIGHT,
} from "./screenTitleHeader";
import { t, type } from "@/theme/tokens";

// Owner, 2026-10-23: My shows' and Calendar's titles as Apple TV's: iOS's
// large title, left aligned with the content.
describe("screenTitleHeader", () => {
  it("sets the title in display, ink, left aligned with the content", () => {
    const options = screenTitleHeader(47);
    expect(options.headerTitleStyle).toMatchObject({
      fontSize: type.display.fontSize,
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
    expect(SCREEN_TITLE_BAR_HEIGHT).toBeGreaterThan(type.display.lineHeight);
    expect(options.headerShadowVisible).toBe(false);
  });
});
