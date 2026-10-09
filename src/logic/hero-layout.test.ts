// The hero's vertical layout and image size (CRI-124).

import { HEADER_BAR_HEIGHT } from "./header";
import {
  HERO_END_ABOVE_TAB_BAR,
  POSTER_REST_DIM,
  posterDimAt,
  posterDimEndScroll,
  progressiveMaskStops,
  reverseMaskStops,
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

  // Mirror round: the seam sits at the title slot's fixed bottom, the
  // same on every slide.
  it("puts the seam at the bottom of the title slot", () => {
    const { imageHeight, contentTop } = heroLayout(844, 47);
    expect(imageHeight).toBe(contentTop + 26 + 16 + 88);
  });

  // Faces and heads sit lower: the image starts under the top safe area
  // and a small margin.
  it.each([
    ["iPhone SE", 667, 20],
    ["iPhone 17", 874, 62],
    ["iPhone 16 Pro Max", 956, 62],
  ])(
    "starts the sharp image under the top safe area on %s, the seam and content where they were",
    (_name, windowHeight, topInset) => {
      const layout = heroLayout(windowHeight, topInset);
      expect(layout.imageTop).toBe(topInset + 8);
      // The blur is full all the way to the seam, so the mirror never
      // reads, and clear a little way into the image, before the heads.
      expect(layout.topBlurFullTo).toBe(layout.imageTop);
      expect(layout.topBlurHeight).toBeGreaterThan(layout.imageTop);
      expect(layout.topBlurHeight - layout.imageTop).toBeLessThanOrEqual(24);
      // Nothing below moves with the inset.
      const atZero = heroLayout(windowHeight, 0);
      expect(layout.imageHeight).toBe(atZero.imageHeight);
      expect(layout.contentTop).toBe(atZero.contentTop);
    },
  );

  it("has an image tall enough to mirror both ends", () => {
    for (const [windowHeight, inset] of [
      [667, 20],
      [874, 62],
      [956, 62],
    ]) {
      const { imageTop, imageHeight, heroHeight } = heroLayout(
        windowHeight,
        inset,
      );
      const image = imageHeight - imageTop;
      expect(heroHeight - imageHeight).toBeLessThanOrEqual(image);
      expect(imageTop).toBeLessThanOrEqual(image);
    }
  });

  it("has a mirror zone no taller than the image it mirrors", () => {
    for (const windowHeight of [667, 844, 956]) {
      const { imageHeight, heroHeight } = heroLayout(windowHeight, 47);
      expect(heroHeight - imageHeight).toBeLessThanOrEqual(imageHeight);
      expect(heroHeight - imageHeight).toBeGreaterThan(0);
    }
  });

  it("starts the blur and the fade on the image itself, at the pill's top", () => {
    const layout = heroLayout(844, 47);
    expect(layout.blurTop).toBe(layout.contentTop);
    expect(layout.blurTop).toBeLessThan(layout.imageHeight);
    expect(layout.fadeTop).toBe(layout.blurTop);
  });

  it("keeps the top gradient thin: just past the status bar", () => {
    const { topGradientHeight } = heroLayout(844, 47);
    expect(topGradientHeight).toBeGreaterThan(47);
    expect(topGradientHeight).toBeLessThan(47 + HEADER_BAR_HEIGHT);
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

describe("progressiveMaskStops (CRI-124)", () => {
  it("is clear at the top, full at the seam, and full below it", () => {
    const { colors, locations } = progressiveMaskStops(0.47);
    expect(colors[0]).toBe("rgba(0,0,0,0)");
    expect(locations[0]).toBe(0);
    const seam = locations.indexOf(0.47);
    expect(colors[seam]).toBe("rgba(0,0,0,1)");
    expect(colors[colors.length - 1]).toBe("rgba(0,0,0,1)");
    expect(locations[locations.length - 1]).toBe(1);
  });

  it("only ever grows", () => {
    const { colors, locations } = progressiveMaskStops(0.47);
    const alphas = colors.map((c) => Number(c.slice(11, -1)));
    expect([...alphas].sort((a, b) => a - b)).toEqual(alphas);
    expect([...locations].sort((a, b) => a - b)).toEqual(locations);
  });
});

describe("reverseMaskStops (CRI-124)", () => {
  it("is strong at the top and clear at the bottom", () => {
    const { colors, locations } = reverseMaskStops(progressiveMaskStops(0.5));
    expect(colors[0]).toBe("rgba(0,0,0,1)");
    expect(locations[0]).toBe(0);
    expect(colors[colors.length - 1]).toBe("rgba(0,0,0,0)");
    expect(locations[locations.length - 1]).toBe(1);
    expect([...locations].sort((a, b) => a - b)).toEqual(locations);
  });
});

// The poster rows' dimming experiment (CRI-124).
describe("posterDimAt (CRI-124)", () => {
  const end = posterDimEndScroll(661, 844);

  it("ends when the first row's heading reaches the middle of the screen", () => {
    // Heading at 661 + 24 in the page; the middle of the screen at 422.
    expect(end).toBe(661 + 24 - 422);
  });

  it("is full at rest and during a pull", () => {
    expect(posterDimAt(0, end)).toBe(POSTER_REST_DIM);
    expect(posterDimAt(-80, end)).toBe(POSTER_REST_DIM);
  });

  it("eases off as Home scrolls, and is gone at the end", () => {
    expect(posterDimAt(end / 2, end)).toBeCloseTo(POSTER_REST_DIM / 2);
    expect(posterDimAt(end / 4, end)).toBeGreaterThan(POSTER_REST_DIM / 2);
    expect(posterDimAt(end, end)).toBe(0);
    expect(posterDimAt(end * 3, end)).toBe(0);
  });
});
