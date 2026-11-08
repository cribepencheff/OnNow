import { type } from "./tokens";

// CRI-151, owner 2026-11-08: every heading in Manrope Bold, set in one
// place, and no fontWeight with it (a font file holds its own weight).
describe("heading type (CRI-151)", () => {
  it("puts display, title and headline in Manrope Bold", () => {
    for (const style of [type.display, type.title, type.headline]) {
      expect(style.fontFamily).toBe("Manrope_700Bold");
      expect("fontWeight" in style).toBe(false);
    }
  });

  it("keeps body text on the system font", () => {
    expect("fontFamily" in type.body).toBe(false);
    expect("fontFamily" in type.meta).toBe(false);
  });
});
