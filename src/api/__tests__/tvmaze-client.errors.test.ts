import { createTvMazeClient } from "../tvmaze-client";
import { TvMazeNetworkError, TvMazeResponseError } from "../tvmaze-errors";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function createFakeClock() {
  let currentTime = 0;
  return {
    now: () => currentTime,
    wait: async (ms: number) => {
      currentTime += ms;
    },
  };
}

describe("TvMazeClient retry and backoff on 429 (NFR-005)", () => {
  it("retries after a 429 and succeeds once the server recovers", async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(null, 429))
      .mockResolvedValueOnce(jsonResponse([{ score: 1, show: {} }]));
    const clock = createFakeClock();
    const waitSpy = jest.fn(clock.wait);
    const client = createTvMazeClient({
      fetchFn,
      now: clock.now,
      wait: waitSpy,
      initialBackoffMs: 1_000,
    });

    const results = await client.searchShows("Slow Horses");

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(results).toHaveLength(1);
  });

  it("backs off with increasing wait times across repeated 429s", async () => {
    const fetchFn = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(null, 429))
      .mockResolvedValueOnce(jsonResponse(null, 429))
      .mockResolvedValueOnce(jsonResponse([]));
    const clock = createFakeClock();
    const waitedDurations: number[] = [];
    const wait = async (ms: number) => {
      waitedDurations.push(ms);
      await clock.wait(ms);
    };
    const client = createTvMazeClient({
      fetchFn,
      now: clock.now,
      wait,
      initialBackoffMs: 1_000,
    });

    await client.searchShows("Slow Horses");

    // Rate-limiter waits are 0ms (slot always free here); backoff waits
    // are the non-zero entries and must increase: 1000ms, then 2000ms.
    const backoffWaits = waitedDurations.filter((ms) => ms > 0);
    expect(backoffWaits).toEqual([1_000, 2_000]);
  });

  it("throws TvMazeResponseError after exhausting retries on repeated 429s", async () => {
    const fetchFn = jest.fn().mockResolvedValue(jsonResponse(null, 429));
    const clock = createFakeClock();
    const client = createTvMazeClient({
      fetchFn,
      now: clock.now,
      wait: clock.wait,
      maxRetries: 2,
      initialBackoffMs: 10,
    });

    await expect(client.searchShows("Slow Horses")).rejects.toThrow(
      TvMazeResponseError,
    );
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });
});

describe("TvMazeClient error handling", () => {
  it("wraps a fetch failure in TvMazeNetworkError", async () => {
    const fetchFn = jest.fn().mockRejectedValue(new Error("offline"));
    const clock = createFakeClock();
    const client = createTvMazeClient({
      fetchFn,
      now: clock.now,
      wait: clock.wait,
    });

    await expect(client.searchShows("Slow Horses")).rejects.toThrow(
      TvMazeNetworkError,
    );
  });

  it("throws TvMazeResponseError for a non-OK, non-429 response", async () => {
    const fetchFn = jest.fn().mockResolvedValue(jsonResponse(null, 500));
    const clock = createFakeClock();
    const client = createTvMazeClient({
      fetchFn,
      now: clock.now,
      wait: clock.wait,
    });

    await expect(client.getShowWithEpisodesAndSeasons(1)).rejects.toMatchObject(
      {
        name: "TvMazeResponseError",
        status: 500,
      },
    );
  });

  it("does not retry on a non-429 error response", async () => {
    const fetchFn = jest.fn().mockResolvedValue(jsonResponse(null, 404));
    const clock = createFakeClock();
    const client = createTvMazeClient({
      fetchFn,
      now: clock.now,
      wait: clock.wait,
    });

    await expect(client.getShowWithEpisodesAndSeasons(999_999)).rejects.toThrow(
      TvMazeResponseError,
    );
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
