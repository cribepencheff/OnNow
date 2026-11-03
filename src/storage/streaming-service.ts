// Each show's streaming services in a region, looked up once through
// TMDB and kept per show and region (FR-014, NFR-005, ADR 0014). Plain AsyncStorage,
// one key per show, like the follow list (NFR-006), not the query cache,
// which is only kept for a day.

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  hasStreamingService,
  NOT_ON_TMDB,
  type ProviderAnswer,
} from "@/logic/streaming-service";

// Refreshed after 30 days, since shows move between services. TMDB does not
// allow keeping its data longer than 6 months (spike 0002).
export const SERVICE_CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
// "Not on TMDB" is kept a day: retried soon, without a search every launch.
export const NOT_ON_TMDB_MAX_AGE_MS = 24 * 60 * 60 * 1000;
// "Unavailable" is kept a day too: JustWatch's data can miss a service for
// days around a premiere and then correct itself (ADR 0005), and a found
// service changes rarely. Only shows without a service cost a daily lookup.
export const NO_SERVICE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface CachedServices {
  checkedAt: number;
  providers: ProviderAnswer;
}

// v4: drops "no service" answers persisted for 30 days, before they were
// kept a day.
function storageKey(showId: number, region: string): string {
  return `onnow.streamingService.v4.${region}.${showId}`;
}

export async function getCachedProviders(
  showId: number,
  region: string,
  now: number,
): Promise<ProviderAnswer | null> {
  const raw = await AsyncStorage.getItem(storageKey(showId, region));
  if (raw === null) {
    return null;
  }
  const cached = JSON.parse(raw) as CachedServices;
  return now - cached.checkedAt > maxAgeFor(cached.providers)
    ? null
    : cached.providers;
}

function maxAgeFor(providers: ProviderAnswer): number {
  if (providers === NOT_ON_TMDB) {
    return NOT_ON_TMDB_MAX_AGE_MS;
  }
  return hasStreamingService(providers)
    ? SERVICE_CACHE_MAX_AGE_MS
    : NO_SERVICE_MAX_AGE_MS;
}

export async function saveProviders(
  showId: number,
  region: string,
  providers: ProviderAnswer,
  now: number,
): Promise<void> {
  const cached: CachedServices = { checkedAt: now, providers };
  await AsyncStorage.setItem(
    storageKey(showId, region),
    JSON.stringify(cached),
  );
}
