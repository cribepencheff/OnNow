// Every navigation goes through here (CRI-117), so a quick double tap
// anywhere opens a screen, goes back, or opens a link only once. One guard
// is shared by the whole app: a tap on a row and a tap on a link right
// after it count as the same double tap. The Stack layouts release it when
// a screen transition ends (releaseNavigation, navigation-lock.ts). Follow
// controls do not navigate and are not guarded: two taps there are two
// changes.
// ESLint keeps expo-router's useRouter and Linking out of every other file.

import { useMemo } from "react";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";

import { startNavigation } from "./navigation-lock";

export { releaseNavigation } from "./navigation-lock";

type Router = ReturnType<typeof useRouter>;

export function useGuardedRouter() {
  const router = useRouter();
  return useMemo(
    () => ({
      push: (...args: Parameters<Router["push"]>) => {
        if (startNavigation()) {
          router.push(...args);
        }
      },
      back: () => {
        if (startNavigation()) {
          router.back();
        }
      },
    }),
    [router],
  );
}

// An external link ("Open in [service]", IMDb, data credits).
export function openExternalUrl(url: string): void {
  if (startNavigation()) {
    void Linking.openURL(url);
  }
}
