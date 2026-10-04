// OMDb client for one question: a show's IMDb rating (CRI-87, ADR 0013).
// The key comes from EXPO_PUBLIC_OMDB_API_KEY in .env, never committed
// (ADR 0002). Without a key, lookups return null and no rating is shown.

import { imdbRating, type OmdbTitleResponse } from "@/logic/imdb-rating";

const BASE_URL = "https://www.omdbapi.com/";

type FetchLike = typeof fetch;

export interface OmdbClientOptions {
  apiKey: string | undefined;
  fetchFn?: FetchLike;
}

export interface OmdbClient {
  // { rating: null } when OMDb has no rating, null when there is no key.
  findImdbRating: (imdbId: string) => Promise<{ rating: string | null } | null>;
}

export class OmdbResponseError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`OMDb responded with ${status}`);
    this.name = "OmdbResponseError";
    this.status = status;
  }
}

export function createOmdbClient(options: OmdbClientOptions): OmdbClient {
  const { apiKey } = options;
  const fetchFn = options.fetchFn ?? fetch;

  async function findImdbRating(imdbId: string) {
    if (!apiKey) {
      return null;
    }
    const url = `${BASE_URL}?i=${encodeURIComponent(imdbId)}&apikey=${apiKey}`;
    const response = await fetchFn(url);
    // A bad key or a used-up daily limit is a 401: an error, not "no rating".
    if (!response.ok) {
      throw new OmdbResponseError(response.status);
    }
    return { rating: imdbRating((await response.json()) as OmdbTitleResponse) };
  }

  return { findImdbRating };
}

export const omdbClient = createOmdbClient({
  apiKey: process.env.EXPO_PUBLIC_OMDB_API_KEY,
});
