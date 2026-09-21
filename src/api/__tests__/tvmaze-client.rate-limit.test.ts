import { createTvMazeClient } from "../tvmaze-client";

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as Response;
}

// A fake clock: `now()` reads the current simulated time, `wait(ms)`
// advances it instantly instead of really waiting, so the rate limiter's
// throttling can be tested without slowing down the test suite (NFR-005).
function createFakeClock() {
  let currentTime = 0;
  return {
    now: () => currentTime,
    wait: async (ms: number) => {
      currentTime += ms;
    },
  };
}

describe("TvMazeClient rate limiter (NFR-005, spike 0001 section 8)", () => {
  it("allows up to the configured limit without waiting", async () => {
    const fetchFn = jest.fn().mockResolvedValue(jsonResponse({}));
    const clock = createFakeClock();
    const client = createTvMazeClient({
      fetchFn,
      now: clock.now,
      wait: clock.wait,
      maxRequests: 20,
      windowMs: 10_000,
    });

    for (let i = 0; i < 20; i++) {
      await client.searchShows(`show-${i}`);
    }

    expect(fetchFn).toHaveBeenCalledTimes(20);
  });

  it("waits for the window to free a slot once the limit is reached", async () => {
    const fetchFn = jest.fn().mockResolvedValue(jsonResponse({}));
    const waitSpy = jest.fn(async (ms: number) => {
      clock.advance(ms);
    });
    const clock = (() => {
      let currentTime = 0;
      return {
        now: () => currentTime,
        advance: (ms: number) => {
          currentTime += ms;
        },
      };
    })();
    const client = createTvMazeClient({
      fetchFn,
      now: clock.now,
      wait: waitSpy,
      maxRequests: 2,
      windowMs: 10_000,
    });

    await client.searchShows("a");
    await client.searchShows("b");
    await client.searchShows("c");

    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(waitSpy).toHaveBeenCalled();
  });

  it("never exceeds the configured request count within one window", async () => {
    const clock = createFakeClock();
    const requestCountsPerWindow: number[] = [];
    let countInCurrentWindow = 0;

    const wait = async (ms: number) => {
      requestCountsPerWindow.push(countInCurrentWindow);
      countInCurrentWindow = 0;
      await clock.wait(ms);
    };

    const client = createTvMazeClient({
      fetchFn: (async () => {
        countInCurrentWindow++;
        return jsonResponse({});
      }) as typeof fetch,
      now: clock.now,
      wait,
      maxRequests: 5,
      windowMs: 10_000,
    });

    for (let i = 0; i < 12; i++) {
      await client.searchShows(`show-${i}`);
    }

    for (const count of requestCountsPerWindow) {
      expect(count).toBeLessThanOrEqual(5);
    }
  });
});
