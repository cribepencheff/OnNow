import {
  screenTitleHeader,
  SCREEN_TITLE_BAR_HEIGHT,
  SCREEN_TITLE_SIZE,
} from "./screenTitleHeader";
import { HEADER_BAR_HEIGHT } from "@/logic/header";
import { t, type } from "@/theme/tokens";

// Owner, 2026-10-23: My shows' and Calendar's titles as Apple TV's: iOS's
// large title, left aligned with the content.
describe("screenTitleHeader", () => {
  // Owner, 2026-10-23: a quarter smaller than display (34) read better.
  // Owner, 2026-10-23: at the side inset of Home's logo, not the content's.
  // CRI-151: in the headings' typeface, Manrope Bold.
  it("sets the title a quarter smaller than display, in Manrope Bold, ink, at the header inset", () => {
    const options = screenTitleHeader(47);
    expect(options.headerTitleStyle).toMatchObject({
      fontSize: SCREEN_TITLE_SIZE,
      fontFamily: "Manrope_700Bold",
      color: t.ink,
    });
    expect(options.headerTitleAlign).toBe("left");
    expect(options.headerTitleContainerStyle).toEqual({
      marginHorizontal: t.headerInset,
    });
  });

  it("makes the bar tall enough for it, under the status bar, on bg with no shadow", () => {
    const options = screenTitleHeader(47);
    expect(options.headerStyle).toEqual({
      backgroundColor: t.bg,
      height: 47 + SCREEN_TITLE_BAR_HEIGHT,
    });
    expect(SCREEN_TITLE_SIZE).toBe(Math.round(type.display.fontSize * 0.75));
    // Home's bar's height, so the title sits level with Home's logo.
    expect(SCREEN_TITLE_BAR_HEIGHT).toBe(HEADER_BAR_HEIGHT);
    expect(options.headerShadowVisible).toBe(false);
  });
});
