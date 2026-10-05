import AsyncStorage from "@react-native-async-storage/async-storage";

import { NOT_ON_TMDB } from "@/logic/streaming-service";
import { saveProviders } from "@/storage/streaming-service";
import { hasServiceInRegion } from "../region-service";
import { tmdbClient } from "../tmdb-client";

jest.mock("../tmdb-client", () => ({
  tmdbClient: { providersById: jest.fn() },
}));

const providersById = tmdbClient.providersById as jest.Mock;
const NETFLIX = { providerId: 8, providerName: "Netflix" };
const TELE2_PLAY = { providerId: 497, providerName: "Tele2 Play" };
const MUBI_CHANNEL = { providerId: 201, providerName: "MUBI Amazon Channel" };

describe("hasServiceInRegion (FR-038, FR-039)", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    providersById.mockReset();
  });

  it('uses the answer "Open in" already stored, with no request', async () => {
    await saveProviders(75026, "SE", [NETFLIX], Date.now());
    await expect(hasServiceInRegion(75026, 247718, "SE")).resolves.toBe(true);
    expect(providersById).not.toHaveBeenCalled();
  });

  it('asks TMDB once by TMDB id on a miss, and stores it for "Open in"', async () => {
    providersById.mockResolvedValue([MUBI_CHANNEL]);
    await expect(hasServiceInRegion(92764, 326440, "SE")).resolves.toBe(true);
    await expect(hasServiceInRegion(92764, 326440, "SE")).resolves.toBe(true);
    expect(providersById).toHaveBeenCalledTimes(1);
    expect(providersById).toHaveBeenCalledWith(326440, "SE");
  });

  it('is false with no service, or pay-TV only, as for "Open in"', async () => {
    providersById.mockResolvedValueOnce([]).mockResolvedValueOnce([TELE2_PLAY]);
    await expect(hasServiceInRegion(1, 11, "SE")).resolves.toBe(false);
    await expect(hasServiceInRegion(2, 12, "SE")).resolves.toBe(false);
  });

  it('asks TMDB by TMDB id when "Open in" stored "not on TMDB"', async () => {
    await saveProviders(3, "SE", NOT_ON_TMDB, Date.now());
    providersById.mockResolvedValue([NETFLIX]);
    await expect(hasServiceInRegion(3, 13, "SE")).resolves.toBe(true);
  });

  it("is false without a key or on a failed request", async () => {
    providersById
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error());
    await expect(hasServiceInRegion(4, 14, "SE")).resolves.toBe(false);
    await expect(hasServiceInRegion(5, 15, "SE")).resolves.toBe(false);
  });
});
