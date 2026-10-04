// Cache-first launch (CRI-95, NFR-001, NFR-002): when Home is ready to be
// shown, and the "Updated X ago" line under the pull-to-refresh spinner.

import { homeIsReady, updatedAgoLabel } from "./launch";

const MIN = 60 * 1000;

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

describe("updatedAgoLabel (NFR-002, ADR 0001)", () => {
  const now = 1_000_000_000_000;

  it("says how long ago, never a time of day", () => {
    expect(updatedAgoLabel(now - 20 * 1000, now)).toBe("Updated just now");
    expect(updatedAgoLabel(now - 5 * MIN, now)).toBe("Updated 5 min ago");
    expect(updatedAgoLabel(now - 59 * MIN, now)).toBe("Updated 59 min ago");
    expect(updatedAgoLabel(now - 2 * 60 * MIN, now)).toBe(
      "Updated 2 hours ago",
    );
    expect(updatedAgoLabel(now - 60 * MIN, now)).toBe("Updated 1 hour ago");
    expect(updatedAgoLabel(now - 3 * 24 * 60 * MIN, now)).toBe(
      "Updated 3 days ago",
    );
    expect(updatedAgoLabel(now - 24 * 60 * MIN, now)).toBe("Updated 1 day ago");
  });

  it("is nothing before anything was fetched", () => {
    expect(updatedAgoLabel(null, now)).toBeNull();
  });
});
