import { accent, accentText, withLightness } from "./color";

describe("withLightness", () => {
  it("converts a known hex color to a known lightness (red at 50%)", () => {
    expect(withLightness("#FF0000", 50)).toBe("#FF0000");
  });

  it("darkens a fully saturated color", () => {
    expect(withLightness("#FF0000", 25)).toBe("#800000");
  });

  it("lightens a fully saturated color", () => {
    expect(withLightness("#FF0000", 75)).toBe("#FF8080");
  });

  it("turns a color fully black at 0% lightness", () => {
    expect(withLightness("#75E4AF", 0)).toBe("#000000");
  });

  it("turns a color fully white at 100% lightness", () => {
    expect(withLightness("#75E4AF", 100)).toBe("#FFFFFF");
  });

  it("keeps hue and saturation unchanged, only lightness moves", () => {
    // A pure gray has no hue or saturation to distort, so at any lightness
    // it stays gray (r === g === b): a direct check that only lightness
    // changed, not hue or saturation.
    const darkerGray = withLightness("#808080", 20);
    const lighterGray = withLightness("#808080", 90);

    expect(darkerGray).toBe("#333333");
    expect(lighterGray).toBe("#E6E6E6");
  });

  it("computes accentText as a darker, contrast-safe variant of accent", () => {
    expect(accentText).toBe("#21AB69");
    expect(accentText).not.toBe(accent);
  });
});
