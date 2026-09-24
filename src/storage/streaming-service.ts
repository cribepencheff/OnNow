// Each followed show's Swedish streaming services, looked up once through
// TMDB and kept with the show (FR-014, NFR-005, CRI-82). Plain AsyncStorage,
// one key per show, like the follow list (NFR-006), not the query cache,
// which is only kept for a day.

import AsyncStorage from "@react-native-async-storage/async-storage";

import type { SwedishProvider } from "@/logic/swedish-service";

// Refreshed after 30 days, since shows move between services. TMDB does not
// allow keeping its data longer than 6 months (spike 0002).
export const SERVICE_CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

interface CachedServices {
  checkedAt: number;
  providers: SwedishProvider[];
}

function storageKey(showId: number): string {
  return `onnow.swedishService.${showId}`;
}

export async function getCachedProviders(
  showId: number,
  now: number,
): Promise<SwedishProvider[] | null> {
  const raw = await AsyncStorage.getItem(storageKey(showId));
  if (raw === null) {
    return null;
  }
  const cached = JSON.parse(raw) as CachedServices;
  return now - cached.checkedAt > SERVICE_CACHE_MAX_AGE_MS
    ? null
    : cached.providers;
}

export async function saveProviders(
  showId: number,
  providers: SwedishProvider[],
  now: number,
): Promise<void> {
  const cached: CachedServices = { checkedAt: now, providers };
  await AsyncStorage.setItem(storageKey(showId), JSON.stringify(cached));
}
