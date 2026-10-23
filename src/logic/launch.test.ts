// Cache-first launch (CRI-95, NFR-001): when Home is ready to be shown.

import { homeIsReady } from "./launch";

describe("homeIsReady (CRI-95, NFR-001)", () => {
  it("is ready at once with cached shows, even while they refresh", () => {
    expect(
      homeIsReady({
        followedIdsKnown: true,
        followedCount: 3,
        loadedCount: 3,
        anyShowLoading: false,
      }),
    ).toBe(true);
    expect(
      homeIsReady({
        followedIdsKnown: true,
        followedCount: 3,
        loadedCount: 2,
        anyShowLoading: true,
      }),
    ).toBe(true);
  });

  it("waits for the first fetch with an empty cache", () => {
    expect(
      homeIsReady({
        followedIdsKnown: true,
        followedCount: 3,
        loadedCount: 0,
        anyShowLoading: true,
      }),
    ).toBe(false);
  });

  it("is ready once the first fetch settles, even if it failed", () => {
    expect(
      homeIsReady({
        followedIdsKnown: true,
        followedCount: 3,
        loadedCount: 0,
        anyShowLoading: false,
      }),
    ).toBe(true);
  });

  it("is ready with an empty follow list, and never before the list is known", () => {
    expect(
      homeIsReady({
        followedIdsKnown: true,
        followedCount: 0,
        loadedCount: 0,
        anyShowLoading: false,
      }),
    ).toBe(true);
    expect(
      homeIsReady({
        followedIdsKnown: false,
        followedCount: 0,
        loadedCount: 0,
        anyShowLoading: false,
      }),
    ).toBe(false);
  });
});
