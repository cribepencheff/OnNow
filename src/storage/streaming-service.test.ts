import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  getCachedProviders,
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
    expect(await getCachedProviders(NEAGLEY, 0)).toBeNull();
  });

  it("returns the saved services while fresh, including an empty result", async () => {
    await saveProviders(NEAGLEY, PRIME, 1_000);
    expect(await getCachedProviders(NEAGLEY, 2_000)).toEqual(PRIME);

    await saveProviders(1, [], 1_000);
    expect(await getCachedProviders(1, 2_000)).toEqual([]);
  });

  it("returns nothing once the saved services are older than the maximum age", async () => {
    await saveProviders(NEAGLEY, PRIME, 0);
    expect(
      await getCachedProviders(NEAGLEY, SERVICE_CACHE_MAX_AGE_MS + 1),
    ).toBeNull();
  });

  it("stays within TMDB's 6 month caching limit", () => {
    expect(SERVICE_CACHE_MAX_AGE_MS).toBeLessThan(180 * 24 * 60 * 60 * 1000);
  });
});
