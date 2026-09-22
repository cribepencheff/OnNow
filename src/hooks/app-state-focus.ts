// Wires TanStack Query's focus state to React Native's AppState, so a
// stale query refetches when the app returns to the foreground (FR-011).
// Web has its own default (visibilitychange); this only replaces the
// default on native platforms.

import { focusManager } from "@tanstack/react-query";
import { AppState, Platform } from "react-native";
import type { AppStateStatus } from "react-native";

export function setUpAppStateFocus(): () => void {
  if (Platform.OS === "web") {
    return () => {};
  }

  function onAppStateChange(status: AppStateStatus): void {
    focusManager.setFocused(status === "active");
  }

  const subscription = AppState.addEventListener("change", onAppStateChange);
  return () => subscription.remove();
}
