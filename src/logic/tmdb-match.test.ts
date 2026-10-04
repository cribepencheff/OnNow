// CRI-99: when TVmaze has no IMDb or TheTVDB ID, a TMDB name search is
// accepted only on a safe match.

import { matchTmdbSearch, normalizeTitle } from "./tmdb-match";

const jayZ = {
  id: 326440,
  name: "JAŸ-Z in 8",
  first_air_date: "2026-09-18",
  origin_country: ["US"],
};

describe("normalizeTitle (CRI-99)", () => {
  it("ignores case, accents and punctuation", () => {
    expect(normalizeTitle("JAŸ-Z IN 8")).toBe("jayzin8");
    expect(normalizeTitle("Jay-Z in 8")).toBe("jayzin8");
    expect(normalizeTitle("Café Society!")).toBe("cafesociety");
  });
});

describe("matchTmdbSearch (CRI-99)", () => {
  it("accepts the result with the same first air date (JAŸ-Z IN 8)", () => {
    expect(matchTmdbSearch([jayZ], "JAŸ-Z IN 8", "2026-09-18")).toBe(jayZ);
  });

  it("picks the one same-date result among other shows", () => {
    const other = { id: 1, name: "Jay", first_air_date: "2013-07-21" };
    expect(matchTmdbSearch([other, jayZ], "JAŸ-Z IN 8", "2026-09-18")).toBe(
      jayZ,
    );
  });

  it("uses the exact name when several results share the date, else none", () => {
    const twin = { ...jayZ, id: 2, name: "Something Else" };
    expect(matchTmdbSearch([twin, jayZ], "JAŸ-Z IN 8", "2026-09-18")).toBe(
      jayZ,
    );
    const sameName = { ...jayZ, id: 3 };
    expect(
      matchTmdbSearch([sameName, jayZ], "JAŸ-Z IN 8", "2026-09-18"),
    ).toBeNull();
  });

  it("allows one day off only for a single result with the exact name", () => {
    expect(matchTmdbSearch([jayZ], "JAŸ-Z IN 8", "2026-09-17")).toBe(jayZ);
    expect(matchTmdbSearch([jayZ], "JAŸ-Z IN 8", "2026-09-19")).toBe(jayZ);
  });

  it("refuses one day off with another name or several results", () => {
    expect(matchTmdbSearch([jayZ], "Jay-Z in Eight", "2026-09-17")).toBeNull();
    const other = { id: 1, name: "Jay", first_air_date: "2013-07-21" };
    expect(
      matchTmdbSearch([jayZ, other], "JAŸ-Z IN 8", "2026-09-17"),
    ).toBeNull();
  });

  it("refuses two days off, a missing date, or no premiere date on TVmaze", () => {
    expect(matchTmdbSearch([jayZ], "JAŸ-Z IN 8", "2026-09-16")).toBeNull();
    expect(
      matchTmdbSearch(
        [{ ...jayZ, first_air_date: "" }],
        "JAŸ-Z IN 8",
        "2026-09-18",
      ),
    ).toBeNull();
    expect(matchTmdbSearch([jayZ], "JAŸ-Z IN 8", null)).toBeNull();
  });

  it("is none for no results", () => {
    expect(matchTmdbSearch([], "JAŸ-Z IN 8", "2026-09-18")).toBeNull();
  });
});
