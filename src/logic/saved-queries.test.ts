import { shouldSaveQuery } from "./saved-queries";

// ADR 0017: only some kinds of data are written to the phone.
describe("shouldSaveQuery", () => {
  const followed = [1, 2];

  it("saves a followed show, not one only looked at", () => {
    expect(shouldSaveQuery(["show", 1], followed)).toBe(true);
    expect(shouldSaveQuery(["show", 99], followed)).toBe(false);
    expect(shouldSaveQuery(["show", 1], undefined)).toBe(false);
  });

  it("saves TMDB matches, hero images and what the discovery rows are filled from", () => {
    for (const key of [
      ["tmdbFind", "v1", "tt1", null],
      ["hero-images-v5", 1],
      ["recommendations", "v1", 1],
      ["airingThisWeek", "v1", "SE", "2026-10-22", "UTC"],
      ["tvmazeWeekInfo", "v1", 5],
    ]) {
      expect(shouldSaveQuery(key, followed)).toBe(true);
    }
  });

  // ADR 0017 amendment: a row's pages belong to one launch (their keys
  // have the launch time), so a saved page is never read again, and saving
  // them piled up one set per launch.
  it("does not save the discovery rows' pages, which belong to one launch", () => {
    for (const key of [
      ["topPicksPage", "v3", 1761130000000, "SE", "2026-10-22", 0],
      ["topPicksPageIndex", 1761130000000, "2026-10-22"],
      ["airingThisWeekPage", "v6", 1761130000000, "SE", "2026-10-22", 0],
      ["airingThisWeekPageIndex", 1761130000000],
    ]) {
      expect(shouldSaveQuery(key, followed)).toBe(false);
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
