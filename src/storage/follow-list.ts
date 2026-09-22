// The follow list is the user's own data: which TVmaze show IDs they follow.
// It is kept in plain AsyncStorage, not the TanStack Query cache (ADR 0009),
// so a future widget can read it directly (NFR-006) and it never leaves the
// device (NFR-004).

import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "onnow.followList";

export type ShowId = number;

async function readIds(): Promise<ShowId[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw === null) {
    return [];
  }
  return JSON.parse(raw) as ShowId[];
}

async function writeIds(ids: ShowId[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export async function getFollowedIds(): Promise<ShowId[]> {
  return readIds();
}

export async function isFollowed(showId: ShowId): Promise<boolean> {
  const ids = await readIds();
  return ids.includes(showId);
}

export async function follow(showId: ShowId): Promise<void> {
  const ids = await readIds();
  if (ids.includes(showId)) {
    return;
  }
  await writeIds([...ids, showId]);
}

export async function unfollow(showId: ShowId): Promise<void> {
  const ids = await readIds();
  await writeIds(ids.filter((id) => id !== showId));
}
