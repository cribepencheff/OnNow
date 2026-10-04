import AsyncStorage from "@react-native-async-storage/async-storage";

import { saveTvMazeId } from "@/storage/tvmaze-id";
import { tmdbClient } from "../tmdb-client";
import { tvMazeClient } from "../tvmaze-client";
import { resolveTvMazeId } from "../tvmaze-id";

jest.mock("../tmdb-client", () => ({
  tmdbClient: { externalIdsById: jest.fn() },
}));
jest.mock("../tvmaze-client", () => ({
  tvMazeClient: { lookupShowId: jest.fn() },
}));

const externalIdsById = tmdbClient.externalIdsById as jest.Mock;
const lookupShowId = tvMazeClient.lookupShowId as jest.Mock;

describe("resolveTvMazeId (FR-038)", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    externalIdsById.mockReset();
    lookupShowId.mockReset();
  });

  it("uses the stored id without any request", async () => {
    await saveTvMazeId(61886, 15299, Date.now());
    await expect(resolveTvMazeId(61886)).resolves.toBe(15299);
    expect(externalIdsById).not.toHaveBeenCalled();
    expect(lookupShowId).not.toHaveBeenCalled();
  });

  it("looks the title up once and stores it, found or not", async () => {
    externalIdsById.mockResolvedValue({ imdb: "tt2", thetvdb: null });
    lookupShowId.mockResolvedValueOnce(15299).mockResolvedValueOnce(null);

    await expect(resolveTvMazeId(61886)).resolves.toBe(15299);
    await expect(resolveTvMazeId(61886)).resolves.toBe(15299);
    await expect(resolveTvMazeId(7)).resolves.toBeNull();
    await expect(resolveTvMazeId(7)).resolves.toBeNull();
    expect(lookupShowId).toHaveBeenCalledTimes(2);
  });

  it("stores nothing without a TMDB key or when a request fails", async () => {
    externalIdsById.mockResolvedValueOnce(null);
    await expect(resolveTvMazeId(1)).resolves.toBeNull();

    externalIdsById.mockResolvedValueOnce({ imdb: "tt3", thetvdb: null });
    lookupShowId.mockRejectedValueOnce(new Error("TVmaze 500"));
    await expect(resolveTvMazeId(1)).resolves.toBeNull();

    expect(await AsyncStorage.getAllKeys()).toEqual([]);
  });
});
