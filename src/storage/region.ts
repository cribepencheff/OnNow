// The user's region and where it came from (FR-016, CRI-88, ADR 0014), in
// plain AsyncStorage so a future widget can read it (NFR-006).

import AsyncStorage from "@react-native-async-storage/async-storage";

import type { StoredRegion } from "@/logic/region";

const STORAGE_KEY = "onnow.region";

export async function getStoredRegion(): Promise<StoredRegion | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw === null ? null : (JSON.parse(raw) as StoredRegion);
}

export async function saveStoredRegion(region: StoredRegion): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(region));
}
