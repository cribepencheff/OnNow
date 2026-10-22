import { shouldSaveQuery } from "./saved-queries";

// ADR 0017: only some kinds of data are written to the phone.
describe("shouldSaveQuery", () => {
  const followed = [1, 2];

  it("saves a followed show, not one only looked at", () => {
    expect(shouldSaveQuery(["show", 1], followed)).toBe(true);
    expect(shouldSaveQuery(["show", 99], followed)).toBe(false);
    expect(shouldSaveQuery(["show", 1], undefined)).toBe(false);
  });

  it("saves TMDB matches, hero images and the discovery rows", () => {
    for (const key of [
      ["tmdbFind", "v1", "tt1", null],
      ["hero-images-v5", 1],
      ["recommendations", "v1", 1],
      ["topPicksPage", "v3", "launch", "SE", "2026-10-22", 0],
      ["topPicksPageIndex", "launch", "2026-10-22"],
      ["airingThisWeek", "v1", "SE", "2026-10-22", "UTC"],
      ["airingThisWeekPage", "v6", "launch", "SE", "2026-10-22", 0],
      ["airingThisWeekPageIndex", "launch"],
      ["tvmazeWeekInfo", "v1", 5],
    ]) {
      expect(shouldSaveQuery(key, followed)).toBe(true);
    }
  });

  it("saves the follow list and the region, for an instant launch", () => {
    expect(shouldSaveQuery(["followedIds"], followed)).toBe(true);
    expect(shouldSaveQuery(["storedRegion"], followed)).toBe(true);
  });

  it("does not save passing data, or what plain storage already keeps", () => {
    for (const key of [
      ["searchShows", "slow"],
      ["externalIds", "v1", 1],
      ["originCountries", "v2", 1],
      ["streamingService", "v3", "SE", 1],
      ["imdbRating", 1],
    ]) {
      expect(shouldSaveQuery(key, followed)).toBe(false);
    }
  });

  it("does not save a kind it does not know: each kind is chosen", () => {
    expect(shouldSaveQuery(["somethingNew", 1], followed)).toBe(false);
  });
});
