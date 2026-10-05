import { createNavigationGuard, NAVIGATION_LOCK_MS } from "./navigation-guard";

describe("navigation guard (CRI-117)", () => {
  it("lets the first navigation through", () => {
    const guard = createNavigationGuard();
    expect(guard.tryStart(1000)).toBe(true);
  });

  it("ignores a second navigation while the first is in progress (double tap)", () => {
    const guard = createNavigationGuard();
    guard.tryStart(1000);
    expect(guard.tryStart(1100)).toBe(false);
  });

  it("lets the next navigation through once the transition has ended", () => {
    const guard = createNavigationGuard();
    guard.tryStart(1000);
    guard.release();
    expect(guard.tryStart(1100)).toBe(true);
  });

  it("frees itself after the lock time when no transition end arrives", () => {
    const guard = createNavigationGuard();
    guard.tryStart(1000);
    expect(guard.tryStart(1000 + NAVIGATION_LOCK_MS - 1)).toBe(false);
    expect(guard.tryStart(1000 + NAVIGATION_LOCK_MS)).toBe(true);
  });

  it("an ignored tap does not extend the lock", () => {
    const guard = createNavigationGuard();
    guard.tryStart(1000);
    guard.tryStart(1000 + NAVIGATION_LOCK_MS - 1);
    expect(guard.tryStart(1000 + NAVIGATION_LOCK_MS)).toBe(true);
  });
});
