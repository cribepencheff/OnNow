import {
  currentRegion,
  detectRegion,
  FALLBACK_REGION,
  type StoredRegion,
} from "./region";
import { isSupportedRegion, regionName, regionNameInSentence } from "./regions";

describe("detectRegion (FR-016, CRI-88, ADR 0014)", () => {
  it("takes the region of the phone's first locale", () => {
    expect(detectRegion([{ regionCode: "SE" }])).toBe("SE");
    expect(detectRegion([{ regionCode: "GB" }])).toBe("GB");
  });

  it("uppercases a lowercase region code", () => {
    expect(detectRegion([{ regionCode: "us" }])).toBe("US");
  });

  it("skips locales without a region, or with one TMDB has no data for", () => {
    expect(
      detectRegion([
        { regionCode: null },
        { regionCode: "AQ" },
        { regionCode: "NL" },
      ]),
    ).toBe("NL");
  });

  it("falls back when no locale gives a usable region", () => {
    expect(detectRegion([])).toBe(FALLBACK_REGION);
    expect(detectRegion([{ regionCode: null }])).toBe(FALLBACK_REGION);
    expect(detectRegion([{ regionCode: "AQ" }])).toBe(FALLBACK_REGION);
  });

  it("has a fallback that is itself a supported region", () => {
    expect(isSupportedRegion(FALLBACK_REGION)).toBe(true);
  });
});

describe("currentRegion (FR-016, CRI-88, ADR 0014)", () => {
  it("uses the detected region when nothing is stored", () => {
    expect(currentRegion(null, "SE")).toBe("SE");
  });

  it("follows the device when the stored region came from the device", () => {
    const stored: StoredRegion = { code: "SE", source: "device" };
    expect(currentRegion(stored, "GB")).toBe("GB");
  });

  it("keeps a manual override over the device region", () => {
    const stored: StoredRegion = { code: "US", source: "manual" };
    expect(currentRegion(stored, "SE")).toBe("US");
  });

  it("ignores a stored override that is no longer a supported region", () => {
    const stored: StoredRegion = { code: "AQ", source: "manual" };
    expect(currentRegion(stored, "SE")).toBe("SE");
  });
});

describe("regions (CRI-88)", () => {
  it("names regions with TMDB's English names", () => {
    expect(regionName("SE")).toBe("Sweden");
    expect(regionName("US")).toBe("United States of America");
  });

  it("adds the article where a name needs one in a sentence", () => {
    expect(regionNameInSentence("SE")).toBe("Sweden");
    expect(regionNameInSentence("GB")).toBe("the United Kingdom");
    expect(regionNameInSentence("NL")).toBe("the Netherlands");
  });

  it("shows the code itself for an unknown region", () => {
    expect(regionName("AQ")).toBe("AQ");
  });
});
