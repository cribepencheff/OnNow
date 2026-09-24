// PROTOTYPE (proto/home-backdrop, not for merge): a followed show's chosen
// backdrop, stored so it changes only when a new episode comes out, not on
// every read. Plain AsyncStorage, one key per show, the same pattern as
// src/storage/streaming-service.ts.

import AsyncStorage from "@react-native-async-storage/async-storage";

export type BackdropPickReason = "followed" | "new-episode";

export interface StoredBackdrop {
  filePath: string;
  reason: BackdropPickReason;
  // Which of the design system's rules actually chose this backdrop
  // ("newest", "second most voted", ...), kept so a cache hit can report
  // the true original reason, not a guess.
  rule: string;
  // The local release date (episode or drop) this pick is tied to, or null
  // for a "followed" pick made before any release date was known. A new,
  // later release date is what triggers the next re-pick.
  pickedForReleaseDate: string | null;
  // "S2E5", or "Season 1, 8 episodes" for a drop; null for "followed".
  episodeCode: string | null;
  // The changes endpoint's upload time, when the "newest" rule found one.
  newestUploadTime: string | null;
}

function storageKey(showId: number): string {
  return `onnow.protoBackdrop.${showId}`;
}

export async function getStoredBackdrop(
  showId: number,
): Promise<StoredBackdrop | null> {
  const raw = await AsyncStorage.getItem(storageKey(showId));
  return raw ? (JSON.parse(raw) as StoredBackdrop) : null;
}

export async function saveStoredBackdrop(
  showId: number,
  value: StoredBackdrop,
): Promise<void> {
  await AsyncStorage.setItem(storageKey(showId), JSON.stringify(value));
}

// "Unfollowing and following again picks anew": nothing else clears this,
// so the follow list itself is watched for that (see
// useBackdropUnfollowReset) and clears it here on unfollow.
export async function clearStoredBackdrop(showId: number): Promise<void> {
  await AsyncStorage.removeItem(storageKey(showId));
}
