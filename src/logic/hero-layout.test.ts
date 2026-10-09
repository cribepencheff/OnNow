// The hero's vertical layout and image size (CRI-124).

import {
  APP_LOGO_HEIGHT,
  APP_LOGO_TOP_SPACE,
  HERO_ROW_PEEK,
  TAB_BAR_HEIGHT,
  heroImageSize,
  heroLayout,
} from "./hero-layout";

describe("heroLayout (CRI-124)", () => {
  it("ends the hero about one button height above the tab bar, so the first row peeks in", () => {
    const { heroHeight } = heroLayout(844, 47);
    expect(heroHeight).toBe(844 - TAB_BAR_HEIGHT - HERO_ROW_PEEK);
    expect(HERO_ROW_PEEK).toBeGreaterThanOrEqual(44);
    expect(HERO_ROW_PEEK).toBeLessThanOrEqual(52);
  });

  it("uses a 47pt button on regular screens and 44pt on short ones", () => {
    expect(heroLayout(844, 47).buttonHeight).toBe(47);
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
      const logoBottom = topInset + APP_LOGO_TOP_SPACE + APP_LOGO_HEIGHT;
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

  it("starts the fade above the content, so the pill sits on it", () => {
    const layout = heroLayout(844, 47);
    expect(layout.fadeTop).toBeLessThan(layout.contentTop);
    expect(layout.fadeTop).toBeGreaterThanOrEqual(0);
  });

  it("makes the top gradient cover the status bar and the logo", () => {
    const { topGradientHeight } = heroLayout(844, 47);
    expect(topGradientHeight).toBeGreaterThan(
      47 + APP_LOGO_TOP_SPACE + APP_LOGO_HEIGHT,
    );
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
