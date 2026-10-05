// One navigation at a time (CRI-117): a quick double tap must not open the
// same screen twice. A navigation locks the guard until its screen
// transition ends; if no transition end arrives (an external link, a push
// that does not animate), the lock frees itself after NAVIGATION_LOCK_MS.
// The time is checked when a tap happens, against the current clock, so no
// timer is needed.

// Longer than a screen transition (about 350 ms on iOS) plus a double tap,
// short enough that a deliberate second tap after a stuck lock still works.
export const NAVIGATION_LOCK_MS = 1000;

export interface NavigationGuard {
  // Whether a navigation may start now; if so, the guard locks.
  tryStart(now: number): boolean;
  release(): void;
}

export function createNavigationGuard(): NavigationGuard {
  let lockedUntil = 0;
  return {
    tryStart(now) {
      if (now < lockedUntil) {
        return false;
      }
      lockedUntil = now + NAVIGATION_LOCK_MS;
      return true;
    },
    release() {
      lockedUntil = 0;
    },
  };
}
