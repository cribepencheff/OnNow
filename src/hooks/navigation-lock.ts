// The app's one navigation guard (CRI-117), shared by useGuardedRouter and
// openExternalUrl. Its own module, without expo-router, so the Stack
// layouts and Jest setup can release it.

import { createNavigationGuard } from "@/logic/navigation-guard";

const guard = createNavigationGuard();

export function startNavigation(): boolean {
  return guard.tryStart(Date.now());
}

// The Stack layouts call this when a screen transition ends; Jest setup
// before each test.
export function releaseNavigation(): void {
  guard.release();
}
