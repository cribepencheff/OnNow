// A dev switch (Images (dev), CRI-140): draw the hero's sharp image at
// TMDB's w1920 (1920×1080, not in TMDB's documented sizes) instead of
// "original", to compare sharpness and cold-start memory on the phone.
// Saved in plain AsyncStorage so it holds over a cold start; never set,
// the hero stays at "original".

import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const HERO_W1920_STORAGE_KEY = "onnow.dev.heroW1920";

let heroW1920 = false;
const listeners = new Set<() => void>();

function update(on: boolean) {
  heroW1920 = on;
  listeners.forEach((listener) => listener());
}

export async function loadHeroW1920(): Promise<void> {
  const saved = await AsyncStorage.getItem(HERO_W1920_STORAGE_KEY).catch(
    () => null,
  );
  update(saved === "true");
}

export async function setHeroW1920(on: boolean): Promise<void> {
  update(on);
  await AsyncStorage.setItem(HERO_W1920_STORAGE_KEY, String(on)).catch(
    () => {},
  );
}

loadHeroW1920();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useHeroW1920(): boolean {
  return useSyncExternalStore(subscribe, () => heroW1920);
}
