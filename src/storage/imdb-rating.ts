// Each show's IMDb rating from OMDb, kept per show in plain AsyncStorage
// (CRI-87, ADR 0013, NFR-006). "No rating" is cached too.

import AsyncStorage from "@react-native-async-storage/async-storage";

// Ratings move slowly; a week keeps OMDb requests far below the free tier.
export const RATING_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

interface CachedRating {
  checkedAt: number;
  rating: string | null;
}

function storageKey(showId: number): string {
  return `onnow.imdbRating.${showId}`;
}

// undefined when there is no fresh entry; null is a cached "no rating".
export async function getCachedRating(
  showId: number,
  now: number,
): Promise<string | null | undefined> {
  const raw = await AsyncStorage.getItem(storageKey(showId));
  if (raw === null) {
    return undefined;
  }
  const cached = JSON.parse(raw) as CachedRating;
  return now - cached.checkedAt > RATING_CACHE_MAX_AGE_MS
    ? undefined
    : cached.rating;
}

export async function saveRating(
  showId: number,
  rating: string | null,
  now: number,
): Promise<void> {
  const cached: CachedRating = { checkedAt: now, rating };
  await AsyncStorage.setItem(storageKey(showId), JSON.stringify(cached));
}
