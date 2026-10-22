// Calls onDone when a background refresh that started soon after the app
// opened, or came back to the foreground, is done. Home settles its hero
// on it: the hero does not change while the user is on Home (CRI-135), and
// with a week-old saved cache (query-client.ts) it would otherwise keep
// last time's slides after days away, until a pull. Only that first
// refresh: one later on, mid-use, is left to a pull or leaving Home, as
// before. "Soon": a refresh starting within REFRESH_WINDOW_MS.

import { useEffect, useRef } from "react";
import { AppState } from "react-native";

const REFRESH_WINDOW_MS = 10_000;

export function useAfterLaunchRefresh(
  isRefetching: boolean,
  onDone: () => void,
): void {
  // When the app last opened or came back; set in an effect, not while
  // rendering, which must not read the clock.
  const activeSince = useRef(0);
  const refreshStartedAt = useRef<number | null>(null);

  useEffect(() => {
    activeSince.current = Date.now();
    const subscription = AppState.addEventListener("change", (status) => {
      if (status === "active") {
        activeSince.current = Date.now();
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (isRefetching) {
      refreshStartedAt.current = Date.now();
      return;
    }
    const startedAt = refreshStartedAt.current;
    refreshStartedAt.current = null;
    if (
      startedAt !== null &&
      startedAt - activeSince.current <= REFRESH_WINDOW_MS
    ) {
      onDone();
    }
  }, [isRefetching, onDone]);
}
