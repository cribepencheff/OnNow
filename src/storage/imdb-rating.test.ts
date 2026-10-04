import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  getCachedRating,
  NO_RATING_CACHE_MAX_AGE_MS,
  RATING_CACHE_MAX_AGE_MS,
  saveRating,
} from "./imdb-rating";

const MOBLAND = 75026;

describe("IMDb rating cache (CRI-87, ADR 0013)", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("has nothing before a lookup", async () => {
    expect(await getCachedRating(MOBLAND, 0)).toBeUndefined();
  });

  it("returns a fresh rating, and a cached no rating as null", async () => {
    await saveRating(MOBLAND, "8.3", 1_000);
    expect(await getCachedRating(MOBLAND, 2_000)).toBe("8.3");

    await saveRating(1, null, 1_000);
    expect(await getCachedRating(1, 2_000)).toBeNull();
  });

  it("CRI-92: keeps a no rating (OMDb N/A) for a day only, so a new show picks up its rating", async () => {
    await saveRating(MOBLAND, null, 0);
    expect(
      await getCachedRating(MOBLAND, NO_RATING_CACHE_MAX_AGE_MS),
    ).toBeNull();
    expect(
      await getCachedRating(MOBLAND, NO_RATING_CACHE_MAX_AGE_MS + 1),
    ).toBeUndefined();
  });

  it("CRI-92: a real rating outlives a no rating, and still expires", async () => {
    await saveRating(MOBLAND, "8.2", 0);
    expect(await getCachedRating(MOBLAND, NO_RATING_CACHE_MAX_AGE_MS + 1)).toBe(
      "8.2",
    );
  });

  it("expires after a week", async () => {
    await saveRating(MOBLAND, "8.3", 0);
    expect(await getCachedRating(MOBLAND, RATING_CACHE_MAX_AGE_MS)).toBe("8.3");
    expect(
      await getCachedRating(MOBLAND, RATING_CACHE_MAX_AGE_MS + 1),
    ).toBeUndefined();
  });
});
