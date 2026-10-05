import { releaseNavigation } from "@/hooks/navigation-lock";

// CRI-117: the navigation guard is app-wide, and tests have no screen
// transitions to release it, so each test starts unlocked.
beforeEach(() => {
  releaseNavigation();
});
