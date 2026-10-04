import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  getCachedTvMazeId,
  NO_TVMAZE_ID_MAX_AGE_MS,
  saveTvMazeId,
  TVMAZE_ID_MAX_AGE_MS,
} from "./tvmaze-id";

describe("TVmaze id cache (FR-038)", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("has nothing before a lookup", async () => {
    expect(await getCachedTvMazeId(61886, 0)).toBeUndefined();
  });

  it("keeps a found id for 90 days", async () => {
    await saveTvMazeId(61886, 15299, 0);
    expect(await getCachedTvMazeId(61886, TVMAZE_ID_MAX_AGE_MS)).toBe(15299);
    expect(
      await getCachedTvMazeId(61886, TVMAZE_ID_MAX_AGE_MS + 1),
    ).toBeUndefined();
  });

  it('keeps "not on TVmaze" for a week', async () => {
    await saveTvMazeId(1, null, 0);
    expect(await getCachedTvMazeId(1, NO_TVMAZE_ID_MAX_AGE_MS)).toBeNull();
    expect(
      await getCachedTvMazeId(1, NO_TVMAZE_ID_MAX_AGE_MS + 1),
    ).toBeUndefined();
  });
});
