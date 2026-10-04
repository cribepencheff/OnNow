// TMDB client for which streaming services carry a show in the user's
// region (FR-014, FR-017, spike 0002, ADR 0014), and the show's origin
// countries (FR-028). TMDB's watch provider data comes
// from JustWatch; both must be credited (NFR-007, see TmdbCredit).
//
// The API key comes from EXPO_PUBLIC_TMDB_API_KEY in .env, which is never
// committed (ADR 0002). Without a key, lookups return null and the app
// falls back to what TVmaze alone gives.

import {
  regionProviders,
  tmdbOriginCountries,
  tmdbTvId,
  type StreamingProvider,
  type TmdbFindResponse,
} from "@/logic/streaming-service";
import type { TvMazeExternals } from "./tvmaze-types";

const BASE_URL = "https://api.themoviedb.org/3";

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1_000;

// A v4 read access token is a long JWT; a v3 API key is 32 characters.
const V3_KEY_MAX_LENGTH = 40;

type FetchLike = typeof fetch;
type WaitFn = (ms: number) => Promise<void>;

export interface TmdbClientOptions {
  apiKey: string | undefined;
  fetchFn?: FetchLike;
  wait?: WaitFn;
}

export interface TmdbClient {
  // The region's services for a show, [] when TMDB has none or does not
  // know the show, null when there is no API key.
  findStreamingProviders: (
    externals: Pick<TvMazeExternals, "imdb" | "thetvdb">,
    region: string,
  ) => Promise<StreamingProvider[] | null>;
  // ISO codes, [] when TMDB does not know the show, null without a key.
  findOriginCountries: (
    externals: Pick<TvMazeExternals, "imdb" | "thetvdb">,
  ) => Promise<string[] | null>;
}

export class TmdbResponseError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`TMDB responded with ${status}`);
    this.name = "TmdbResponseError";
    this.status = status;
  }
}

export function createTmdbClient(options: TmdbClientOptions): TmdbClient {
  const { apiKey } = options;
  const fetchFn = options.fetchFn ?? fetch;
  const wait =
    options.wait ??
    ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const isBearer = (apiKey?.length ?? 0) > V3_KEY_MAX_LENGTH;

  // NFR-005: one lookup per followed show, cached for 30 days, so TMDB's
  // rate limit is rarely near. A 429 still backs off and retries.
  async function requestJson<T>(path: string, key: string): Promise<T> {
    const separator = path.includes("?") ? "&" : "?";
    const url = isBearer
      ? `${BASE_URL}${path}`
      : `${BASE_URL}${path}${separator}api_key=${key}`;
    const init = isBearer
      ? { headers: { Authorization: `Bearer ${key}` } }
      : undefined;

    for (let attempt = 0; ; attempt++) {
      const response = await fetchFn(url, init);
      if (response.status === 429 && attempt < MAX_RETRIES) {
        await wait(INITIAL_BACKOFF_MS * 2 ** attempt);
        continue;
      }
      if (!response.ok) {
        throw new TmdbResponseError(response.status);
      }
      return (await response.json()) as T;
    }
  }

  // The show's TMDB find result: by IMDb ID first, then TheTVDB.
  async function findShow(
    externals: Pick<TvMazeExternals, "imdb" | "thetvdb">,
    key: string,
  ): Promise<TmdbFindResponse> {
    if (externals.imdb) {
      const found = await requestJson<TmdbFindResponse>(
        `/find/${externals.imdb}?external_source=imdb_id`,
        key,
      );
      if (tmdbTvId(found) !== null) {
        return found;
      }
    }
    if (externals.thetvdb) {
      return requestJson<TmdbFindResponse>(
        `/find/${externals.thetvdb}?external_source=tvdb_id`,
        key,
      );
    }
    return {};
  }

  async function findStreamingProviders(
    externals: Pick<TvMazeExternals, "imdb" | "thetvdb">,
    region: string,
  ): Promise<StreamingProvider[] | null> {
    if (!apiKey) {
      return null;
    }
    const tvId = tmdbTvId(await findShow(externals, apiKey));
    if (tvId === null) {
      return [];
    }
    return regionProviders(
      await requestJson(`/tv/${tvId}/watch/providers`, apiKey),
      region,
    );
  }

  async function findOriginCountries(
    externals: Pick<TvMazeExternals, "imdb" | "thetvdb">,
  ): Promise<string[] | null> {
    if (!apiKey) {
      return null;
    }
    return tmdbOriginCountries(await findShow(externals, apiKey));
  }

  return { findStreamingProviders, findOriginCountries };
}

export const tmdbClient = createTmdbClient({
  apiKey: process.env.EXPO_PUBLIC_TMDB_API_KEY,
});
