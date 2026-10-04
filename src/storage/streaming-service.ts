// Each show's streaming services in a region, looked up once through
// TMDB and kept per show and region (FR-014, NFR-005, ADR 0014). Plain AsyncStorage,
// one key per show, like the follow list (NFR-006), not the query cache,
// which is only kept for a day.

import AsyncStorage from "@react-native-async-storage/async-storage";

import { NOT_ON_TMDB, type ProviderAnswer } from "@/logic/streaming-service";

// Refreshed after 30 days, since shows move between services. TMDB does not
// allow keeping its data longer than 6 months (spike 0002).
export const SERVICE_CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
// "Not on TMDB" is kept a day: retried soon, without a search every launch.
export const NOT_ON_TMDB_MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface CachedServices {
  checkedAt: number;
  providers: ProviderAnswer;
}

// v2: drops "no services" entries saved for shows TMDB was not matched to
// before the name match (CRI-99); every show is looked up once again.
function storageKey(showId: number, region: string): string {
  return `onnow.streamingService.v2.${region}.${showId}`;
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
  const maxAge =
    cached.providers === NOT_ON_TMDB
      ? NOT_ON_TMDB_MAX_AGE_MS
      : SERVICE_CACHE_MAX_AGE_MS;
  return now - cached.checkedAt > maxAge ? null : cached.providers;
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
