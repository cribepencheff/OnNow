import { TVMAZE_CREDIT } from "./tvmaze-credit";
import { TvMazeNetworkError, TvMazeResponseError } from "./tvmaze-errors";
import type { TvMazeSearchResult, TvMazeShowWithEmbeds } from "./tvmaze-types";

const BASE_URL = "https://api.tvmaze.com";

// TVmaze allows at least 20 requests per 10 seconds per IP (spike 0001,
// section 8). Stay under that with margin.
const RATE_LIMIT_MAX_REQUESTS = 20;
const RATE_LIMIT_WINDOW_MS = 10_000;

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1_000;

export type FetchLike = typeof fetch;
export type NowFn = () => number;
export type WaitFn = (ms: number) => Promise<void>;

export interface TvMazeClientOptions {
  fetchFn?: FetchLike;
  now?: NowFn;
  wait?: WaitFn;
  maxRequests?: number;
  windowMs?: number;
  maxRetries?: number;
  initialBackoffMs?: number;
}

export interface TvMazeClient {
  searchShows: (query: string) => Promise<TvMazeSearchResult[]>;
  getShowWithEpisodesAndSeasons: (id: number) => Promise<TvMazeShowWithEmbeds>;
}

export function createTvMazeClient(
  options: TvMazeClientOptions = {},
): TvMazeClient {
  const fetchFn = options.fetchFn ?? fetch;
  const now = options.now ?? (() => Date.now());
  const wait =
    options.wait ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const maxRequests = options.maxRequests ?? RATE_LIMIT_MAX_REQUESTS;
  const windowMs = options.windowMs ?? RATE_LIMIT_WINDOW_MS;
  const maxRetries = options.maxRetries ?? MAX_RETRIES;
  const initialBackoffMs = options.initialBackoffMs ?? INITIAL_BACKOFF_MS;

  const requestTimestamps: number[] = [];

  async function waitForRateLimitSlot(): Promise<void> {
    while (true) {
      const currentTime = now();
      while (
        requestTimestamps.length > 0 &&
        currentTime - requestTimestamps[0] >= windowMs
      ) {
        requestTimestamps.shift();
      }

      if (requestTimestamps.length < maxRequests) {
        requestTimestamps.push(currentTime);
        return;
      }

      const oldestTimestamp = requestTimestamps[0];
      const timeUntilSlotFrees = oldestTimestamp + windowMs - currentTime;
      await wait(Math.max(timeUntilSlotFrees, 0));
    }
  }

  async function requestJson<T>(path: string): Promise<T> {
    const url = `${BASE_URL}${path}`;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      await waitForRateLimitSlot();

      let response: Response;
      try {
        response = await fetchFn(url);
      } catch (cause) {
        throw new TvMazeNetworkError(cause);
      }

      if (response.status === 429) {
        if (attempt === maxRetries) {
          throw new TvMazeResponseError(response.status, url);
        }
        const backoffMs = initialBackoffMs * 2 ** attempt;
        await wait(backoffMs);
        continue;
      }

      if (!response.ok) {
        throw new TvMazeResponseError(response.status, url);
      }

      return (await response.json()) as T;
    }

    // Unreachable: the loop above always returns or throws.
    throw new TvMazeResponseError(429, url);
  }

  async function searchShows(query: string): Promise<TvMazeSearchResult[]> {
    return requestJson<TvMazeSearchResult[]>(
      `/search/shows?q=${encodeURIComponent(query)}`,
    );
  }

  async function getShowWithEpisodesAndSeasons(
    id: number,
  ): Promise<TvMazeShowWithEmbeds> {
    return requestJson<TvMazeShowWithEmbeds>(
      `/shows/${id}?embed[]=episodes&embed[]=seasons`,
    );
  }

  return { searchShows, getShowWithEpisodesAndSeasons };
}

export const tvMazeClient = createTvMazeClient();

export { TVMAZE_CREDIT };
export * from "./tvmaze-types";
export { TvMazeNetworkError, TvMazeResponseError } from "./tvmaze-errors";
