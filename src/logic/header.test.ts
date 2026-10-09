// The header's scroll behaviour, Apple TV style (CRI-124).

import {
  HEADER_MAX_BLUR,
  headerBlurIntensity,
  headerScrollProgress,
} from "./header";

describe("headerScrollProgress (CRI-124)", () => {
  it("is at rest at the top", () => {
    expect(headerScrollProgress(0, 91)).toBe(0);
  });

  it("stays at rest during a pull, so the header does not follow the content down", () => {
    expect(headerScrollProgress(-120, 91)).toBe(0);
  });

  it("is gone once scrolled past its own height", () => {
    expect(headerScrollProgress(45.5, 91)).toBe(0.5);
    expect(headerScrollProgress(91, 91)).toBe(1);
    expect(headerScrollProgress(600, 91)).toBe(1);
  });
});

describe("headerBlurIntensity (CRI-124)", () => {
  it("is sharp at rest and blurs as it leaves", () => {
    expect(headerBlurIntensity(0)).toBe(0);
    expect(headerBlurIntensity(0.5)).toBe(HEADER_MAX_BLUR / 2);
    expect(headerBlurIntensity(1)).toBe(HEADER_MAX_BLUR);
  });
});
