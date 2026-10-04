import AsyncStorage from "@react-native-async-storage/async-storage";

import { NOT_ON_TMDB } from "@/logic/streaming-service";
import {
  getCachedProviders,
  NOT_ON_TMDB_MAX_AGE_MS,
  saveProviders,
  SERVICE_CACHE_MAX_AGE_MS,
} from "./streaming-service";

const NEAGLEY = 82707;
const PRIME = [{ providerId: 119, providerName: "Amazon Prime Video" }];

// CRI-82: each followed show's Swedish services are looked up once and
// kept with the show, in plain storage (NFR-006).
describe("streaming service cache (CRI-82, NFR-005)", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("returns nothing before a lookup", async () => {
    expect(await getCachedProviders(NEAGLEY, "SE", 0)).toBeNull();
  });

  it("returns the saved services while fresh, including an empty result", async () => {
    await saveProviders(NEAGLEY, "SE", PRIME, 1_000);
    expect(await getCachedProviders(NEAGLEY, "SE", 2_000)).toEqual(PRIME);

    await saveProviders(1, "SE", [], 1_000);
    expect(await getCachedProviders(1, "SE", 2_000)).toEqual([]);
  });

  it("returns nothing once the saved services are older than the maximum age", async () => {
    await saveProviders(NEAGLEY, "SE", PRIME, 0);
    expect(
      await getCachedProviders(NEAGLEY, "SE", SERVICE_CACHE_MAX_AGE_MS + 1),
    ).toBeNull();
  });

  it("keeps each region's services apart (CRI-88)", async () => {
    await saveProviders(NEAGLEY, "SE", PRIME, 1_000);
    expect(await getCachedProviders(NEAGLEY, "US", 2_000)).toBeNull();
    expect(await getCachedProviders(NEAGLEY, "SE", 2_000)).toEqual(PRIME);
  });

  it("stays within TMDB's 6 month caching limit", () => {
    expect(SERVICE_CACHE_MAX_AGE_MS).toBeLessThan(180 * 24 * 60 * 60 * 1000);
  });

  it("CRI-99: ignores entries saved before the name match, under the old key", async () => {
    await AsyncStorage.setItem(
      "onnow.streamingService.SE.92764",
      JSON.stringify({ checkedAt: 0, providers: [] }),
    );
    expect(await getCachedProviders(92764, "SE", 1)).toBeNull();
  });

  it('CRI-102: keeps "not on TMDB" for a day, then asks again', async () => {
    await saveProviders(92764, "SE", NOT_ON_TMDB, 0);
    expect(await getCachedProviders(92764, "SE", NOT_ON_TMDB_MAX_AGE_MS)).toBe(
      NOT_ON_TMDB,
    );
    expect(
      await getCachedProviders(92764, "SE", NOT_ON_TMDB_MAX_AGE_MS + 1),
    ).toBeNull();
  });

  it("CRI-102: keeps a found answer, even an empty one, for 30 days", async () => {
    await saveProviders(1, "SE", [], 0);
    expect(
      await getCachedProviders(1, "SE", NOT_ON_TMDB_MAX_AGE_MS + 1),
    ).toEqual([]);
  });
});
