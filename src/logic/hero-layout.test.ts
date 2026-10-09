// The hero's vertical layout and image size (CRI-124).

import { HEADER_BAR_HEIGHT } from "./header";
import {
  HERO_END_ABOVE_TAB_BAR,
  TAB_BAR_HEIGHT,
  heroImageSize,
  heroLayout,
} from "./hero-layout";

describe("heroLayout (CRI-124)", () => {
  it("ends the hero well above the tab bar, so the first row's heading and posters peek in", () => {
    const { heroHeight } = heroLayout(844, 47);
    expect(heroHeight).toBe(844 - TAB_BAR_HEIGHT - HERO_END_ABOVE_TAB_BAR);
    // A row's heading (24 above, 25 tall) and its gap leave room for the
    // top of the posters.
    expect(HERO_END_ABOVE_TAB_BAR - 24 - 25 - 8).toBeGreaterThan(30);
  });

  // The owner's sketch on a 390 × 844 screen, read for proportions: the
  // pill's centre near 422, the button's near 592, the dots near 644. The
  // pill sits 16 higher since the show's logo got more room around it.
  it("places the content as in the owner's sketch, within a few points", () => {
    const { contentTop, dotsTop } = heroLayout(844, 47);
    const pillCentre = contentTop + 13;
    const buttonCentre = contentTop + 26 + 16 + 88 + 16 + 20 + 8 + 8 + 50 / 2;
    // 16 more room around the logo than the sketch: 2 × (16 − 8).
    expect(Math.abs(pillCentre - (422 - 16))).toBeLessThan(12);
    expect(Math.abs(buttonCentre - 592)).toBeLessThan(12);
    expect(Math.abs(dotsTop + 4 - 644)).toBeLessThan(12);
  });

  it("uses a 50pt button on regular screens and 44pt on short ones", () => {
    expect(heroLayout(844, 47).buttonHeight).toBe(50);
    expect(heroLayout(667, 20).buttonHeight).toBe(44);
  });

  it.each([
    ["iPhone SE", 667, 20],
    ["iPhone 13 mini", 812, 50],
    ["iPhone 16", 844, 47],
    ["iPhone 16 Pro Max", 956, 62],
  ])(
    "keeps the content below the app logo and inside the hero on %s",
    (_name, windowHeight, topInset) => {
      const layout = heroLayout(windowHeight, topInset);
      const logoBottom = topInset + HEADER_BAR_HEIGHT;
      expect(layout.contentTop).toBeGreaterThan(logoBottom + 40);
      expect(layout.contentTop).toBeLessThan(layout.heroHeight);
    },
  );

  it.each([667, 844])(
    "puts the page dots just above the hero's end on a %ipt screen",
    (windowHeight) => {
      const { dotsTop, heroHeight } = heroLayout(windowHeight, 20);
      // 8 for the dots, 8 under them.
      expect(dotsTop).toBe(heroHeight - 16);
    },
  );

  // Round 3: the subject sits above the pill and title, not under them.
  it("ends the sharp image at the top of the content, about 55–60% of the hero", () => {
    const { imageHeight, heroHeight, contentTop } = heroLayout(844, 47);
    expect(imageHeight).toBe(contentTop);
    expect(imageHeight / heroHeight).toBeGreaterThan(0.55);
    expect(imageHeight / heroHeight).toBeLessThan(0.6);
  });

  it("has a mirror zone no taller than the image it mirrors", () => {
    const { imageHeight, heroHeight } = heroLayout(844, 47);
    expect(heroHeight - imageHeight).toBeLessThanOrEqual(imageHeight);
  });

  it("starts the fade into bg at the seam under the sharp image", () => {
    const layout = heroLayout(844, 47);
    expect(layout.fadeTop).toBe(layout.imageHeight);
  });

  it("makes the top gradient cover the status bar and the logo", () => {
    const { topGradientHeight } = heroLayout(844, 47);
    expect(topGradientHeight).toBeGreaterThan(47 + HEADER_BAR_HEIGHT);
  });
});

describe("heroImageSize (CRI-124)", () => {
  it("fetches the original on a 3x phone, where only the middle third of the image shows", () => {
    // 390pt wide box overscanned for the parallax, 714pt tall: a 16:9 image
    // is drawn about 1269pt wide, 3808 pixels at 3x.
    expect(heroImageSize(975, 714, 3)).toBe("original");
  });

  it("fetches the original at 2x too, since the drawn width is set by the hero's height", () => {
    expect(heroImageSize(390, 537, 2)).toBe("original");
  });

  it("takes a smaller size when it is sharp enough", () => {
    expect(heroImageSize(300, 160, 2)).toBe("w780");
    expect(heroImageSize(600, 300, 2)).toBe("w1280");
  });
});
