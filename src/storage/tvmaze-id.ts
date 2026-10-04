// A TMDB show's TVmaze id, kept per TMDB id in plain AsyncStorage (FR-038,
// NFR-006). An id does not change, so a found one is kept long; "not on
// TVmaze" is asked again after a week, since TVmaze adds shows.

import AsyncStorage from "@react-native-async-storage/async-storage";

const DAY_MS = 24 * 60 * 60 * 1000;
// TMDB allows keeping its data up to 6 months (spike 0002).
export const TVMAZE_ID_MAX_AGE_MS = 90 * DAY_MS;
export const NO_TVMAZE_ID_MAX_AGE_MS = 7 * DAY_MS;

interface CachedTvMazeId {
  checkedAt: number;
  tvmazeId: number | null;
}

function storageKey(tmdbId: number): string {
  return `onnow.tvmazeIdForTmdb.v1.${tmdbId}`;
}

// undefined when there is no fresh entry; null is a cached "not on TVmaze".
export async function getCachedTvMazeId(
  tmdbId: number,
  now: number,
): Promise<number | null | undefined> {
  const raw = await AsyncStorage.getItem(storageKey(tmdbId));
  if (raw === null) {
    return undefined;
  }
  const cached = JSON.parse(raw) as CachedTvMazeId;
  const maxAge =
    cached.tvmazeId === null ? NO_TVMAZE_ID_MAX_AGE_MS : TVMAZE_ID_MAX_AGE_MS;
  return now - cached.checkedAt > maxAge ? undefined : cached.tvmazeId;
}

export async function saveTvMazeId(
  tmdbId: number,
  tvmazeId: number | null,
  now: number,
): Promise<void> {
  const cached: CachedTvMazeId = { checkedAt: now, tvmazeId };
  await AsyncStorage.setItem(storageKey(tmdbId), JSON.stringify(cached));
}
