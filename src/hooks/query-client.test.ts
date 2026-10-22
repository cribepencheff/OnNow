import type { Query } from "@tanstack/react-query";

import {
  DEFAULT_GC_TIME_MS,
  KEEP_MS,
  PERSISTED_CACHE_MAX_AGE_MS,
  createQueryClient,
  queryClient,
  shouldSaveToPhone,
} from "./query-client";

const DAY_MS = 24 * 60 * 60 * 1000;

// NFR-001, NFR-002, ADR 0017: kept kinds of data last 21 days, in memory
// and in the saved copy; passing data a day in memory, and is not saved.
describe("query cache lifetime", () => {
  it("keeps kept kinds 21 days, and the saved copy as long", () => {
    expect(KEEP_MS).toBe(21 * DAY_MS);
    expect(PERSISTED_CACHE_MAX_AGE_MS).toBe(KEEP_MS);
  });

  it("drops anything else from memory after a day unused", () => {
    expect(DEFAULT_GC_TIME_MS).toBe(DAY_MS);
    expect(createQueryClient().getDefaultOptions().queries?.gcTime).toBe(
      DEFAULT_GC_TIME_MS,
    );
  });

  // A timer past 2^31 - 1 ms overflows and fires at once.
  it("stays under the timer limit", () => {
    expect(KEEP_MS).toBeLessThan(2 ** 31 - 1);
  });
});

describe("shouldSaveToPhone", () => {
  function settledQuery(queryKey: unknown[]): Query {
    return {
      queryKey,
      state: { status: "success", data: {} },
    } as unknown as Query;
  }

  afterEach(() => queryClient.clear());

  it("saves a followed show and a TMDB match, not a search", () => {
    queryClient.setQueryData(["followedIds"], [1]);
    expect(shouldSaveToPhone(settledQuery(["show", 1]))).toBe(true);
    expect(shouldSaveToPhone(settledQuery(["show", 2]))).toBe(false);
    expect(
      shouldSaveToPhone(settledQuery(["tmdbFind", "v1", "tt1", null])),
    ).toBe(true);
    expect(shouldSaveToPhone(settledQuery(["searchShows", "slow"]))).toBe(
      false,
    );
  });

  it("does not save a query that has not settled", () => {
    const pending = {
      queryKey: ["tmdbFind", "v1", "tt1", null],
      state: { status: "pending" },
    } as unknown as Query;
    expect(shouldSaveToPhone(pending)).toBe(false);
  });
});
