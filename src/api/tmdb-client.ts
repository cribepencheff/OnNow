// TMDB client for which streaming services carry a show in the user's
// region (FR-014, FR-017, spike 0002, ADR 0014), and the show's origin
// countries (FR-028). TMDB's watch provider data comes
// from JustWatch; both must be credited (NFR-007, see TmdbCredit).
//
// The API key comes from EXPO_PUBLIC_TMDB_API_KEY in .env, which is never
// committed (ADR 0002). Without a key, lookups return null and the app
// falls back to what TVmaze alone gives.

import {
  NOT_ON_TMDB,
  regionProviders,
  tmdbOriginCountries,
  tmdbTvId,
  type ProviderAnswer,
  type StreamingProvider,
  type TmdbFindResponse,
} from "@/logic/streaming-service";
import {
  tmdbExternalIds,
  type ExternalIds,
  type TmdbExternalIdsResponse,
} from "@/logic/external-ids";
import type { TmdbOnTheAir } from "@/logic/airing-this-week";
import type { TmdbRecommendation } from "@/logic/recommendations";
import { matchTmdbSearch, type TmdbSearchResult } from "@/logic/tmdb-match";
import { tmdbRating, type TmdbRating } from "@/logic/show-rating";
import { queryClient } from "@/hooks/query-client";
import { createTmdbFindCache } from "@/hooks/tmdb-find-cache";
import type { TmdbImages } from "./tmdb-types";
import type { TvMazeExternals, TvMazeShow } from "./tvmaze-types";
import type {
  SuggestedTitle,
  TmdbTranslation,
} from "@/logic/search-completion";

// What identifies a TVmaze show on TMDB: its external IDs, and its name and
// premiere for a search when it has neither ID (CRI-99).
export type TmdbShowRef = Pick<TvMazeExternals, "imdb" | "thetvdb"> & {
  name: string;
  premiered: string | null;
};

export interface TmdbRecommendations {
  tvId: number;
  results: TmdbRecommendation[];
}

export function tmdbShowRef(show: TvMazeShow): TmdbShowRef {
  return {
    imdb: show.externals?.imdb ?? null,
    thetvdb: show.externals?.thetvdb ?? null,
    name: show.name,
    premiered: show.premiered,
  };
}

const BASE_URL = "https://api.themoviedb.org/3";

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1_000;

// A v4 read access token is a long JWT; a v3 API key is 32 characters.
const V3_KEY_MAX_LENGTH = 40;

type FetchLike = typeof fetch;
type WaitFn = (ms: number) => Promise<void>;

// Answers the find step for a show (findShow below): `find` does the
// request; a cache may answer instead (CRI-107: the app's client keeps
// one /find per show in the query cache, hooks/tmdb-find-cache.ts).
export type CachedFind = (
  show: TmdbShowRef,
  find: () => Promise<TmdbFindResponse>,
) => Promise<TmdbFindResponse>;

export interface TmdbClientOptions {
  apiKey: string | undefined;
  fetchFn?: FetchLike;
  wait?: WaitFn;
  // Without it, every lookup makes its own find request.
  cachedFind?: CachedFind;
}

export interface TmdbClient {
  // The region's services for a show, [] when TMDB has none, NOT_ON_TMDB
  // when TMDB does not know the show, null when there is no API key.
  findStreamingProviders: (
    show: TmdbShowRef,
    region: string,
  ) => Promise<ProviderAnswer | null>;
  // ISO codes, [] when TMDB does not know the show, null without a key.
  findOriginCountries: (show: TmdbShowRef) => Promise<string[] | null>;
  // TMDB's rating ("8.4", ADR 0019) and the show's TMDB page, from the
  // find answer; null without a key, a match or enough votes.
  findRating: (show: TmdbShowRef) => Promise<TmdbRating | null>;
  // TMDB's IMDb and TheTVDB IDs for the show (CRI-103); NOT_ON_TMDB when
  // TMDB does not know it, null without a key.
  findExternalIds: (
    show: TmdbShowRef,
  ) => Promise<ExternalIds | typeof NOT_ON_TMDB | null>;
  // TMDB's recommendations for a followed show, with its own TMDB id so
  // followed shows can be left out (FR-038, ADR 0016).
  findRecommendations: (
    show: TmdbShowRef,
  ) => Promise<TmdbRecommendations | typeof NOT_ON_TMDB | null>;
  // A TMDB show's IMDb and TheTVDB IDs, to find it on TVmaze (FR-038).
  externalIdsById: (tmdbId: number) => Promise<ExternalIds | null>;
  // A followed show's TMDB images, English and textless (the hero's
  // backdrop and logo, ADR 0012), with its TMDB id; NOT_ON_TMDB when TMDB
  // does not know it, null without a key.
  findImages: (
    show: TmdbShowRef,
  ) => Promise<
    | { tvId: number; images: TmdbImages; posterPath: string | null }
    | typeof NOT_ON_TMDB
    | null
  >;
  // TMDB's titles for a half-typed query, its name and original name, to
  // complete the query's last word before searching TVmaze (CRI-142);
  // null without a key.
  suggestTitles: (query: string) => Promise<SuggestedTitle[] | null>;
  // A show's translated titles with their languages, by its TMDB id
  // (owner, 2026-10-23: "Maffiablod in Swedish"); null without a key.
  findTranslations: (tmdbId: number) => Promise<TmdbTranslation[] | null>;
  // Shows on a streaming service in the region with an episode on a day
  // (TMDB discover), soaps excluded, the 20 most popular (FR-039); null
  // without a key. The row asks one day at a time, as it needs it.
  findAiringOn: (request: {
    region: string;
    timeZone: string;
    day: string;
  }) => Promise<TmdbOnTheAir[] | null>;
  // A show's services in a region by its TMDB id (FR-038, FR-039).
  providersById: (
    tmdbId: number,
    region: string,
  ) => Promise<StreamingProvider[] | null>;
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

  // NFR-005: TMDB's rate limit is rarely near (the find step is cached,
  // see cachedFind). A 429 still backs off and retries.
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

  // The show's TMDB find result: by IMDb ID first, then TheTVDB; by name
  // only when TVmaze has neither (CRI-99).
  async function findShow(
    externals: TmdbShowRef,
    key: string,
  ): Promise<TmdbFindResponse> {
    if (!externals.imdb && !externals.thetvdb) {
      const search = await requestJson<{ results?: TmdbSearchResult[] }>(
        `/search/tv?query=${encodeURIComponent(externals.name)}`,
        key,
      );
      const match = matchTmdbSearch(
        search.results ?? [],
        externals.name,
        externals.premiered,
      );
      return { tv_results: match ? [match] : [] };
    }
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

  // The find step for a show, through the cache when the client has one.
  function lookUp(show: TmdbShowRef, key: string): Promise<TmdbFindResponse> {
    return options.cachedFind
      ? options.cachedFind(show, () => findShow(show, key))
      : findShow(show, key);
  }

  async function findStreamingProviders(
    show: TmdbShowRef,
    region: string,
  ): Promise<ProviderAnswer | null> {
    if (!apiKey) {
      return null;
    }
    const tvId = tmdbTvId(await lookUp(show, apiKey));
    if (tvId === null) {
      return NOT_ON_TMDB;
    }
    return regionProviders(
      await requestJson(`/tv/${tvId}/watch/providers`, apiKey),
      region,
    );
  }

  async function findOriginCountries(
    show: TmdbShowRef,
  ): Promise<string[] | null> {
    if (!apiKey) {
      return null;
    }
    return tmdbOriginCountries(await lookUp(show, apiKey));
  }

  async function findRating(show: TmdbShowRef): Promise<TmdbRating | null> {
    if (!apiKey) {
      return null;
    }
    return tmdbRating(await lookUp(show, apiKey));
  }

  async function findExternalIds(
    show: TmdbShowRef,
  ): Promise<ExternalIds | typeof NOT_ON_TMDB | null> {
    if (!apiKey) {
      return null;
    }
    const tvId = tmdbTvId(await lookUp(show, apiKey));
    if (tvId === null) {
      return NOT_ON_TMDB;
    }
    return tmdbExternalIds(
      await requestJson<TmdbExternalIdsResponse>(
        `/tv/${tvId}/external_ids`,
        apiKey,
      ),
    );
  }

  async function findRecommendations(
    show: TmdbShowRef,
  ): Promise<TmdbRecommendations | typeof NOT_ON_TMDB | null> {
    if (!apiKey) {
      return null;
    }
    const tvId = tmdbTvId(await lookUp(show, apiKey));
    if (tvId === null) {
      return NOT_ON_TMDB;
    }
    const response = await requestJson<{ results?: TmdbRecommendation[] }>(
      `/tv/${tvId}/recommendations`,
      apiKey,
    );
    return { tvId, results: response.results ?? [] };
  }

  async function findImages(
    show: TmdbShowRef,
  ): Promise<
    | { tvId: number; images: TmdbImages; posterPath: string | null }
    | typeof NOT_ON_TMDB
    | null
  > {
    if (!apiKey) {
      return null;
    }
    const found = await lookUp(show, apiKey);
    const tvId = tmdbTvId(found);
    if (tvId === null) {
      return NOT_ON_TMDB;
    }
    const images = await requestJson<TmdbImages>(
      `/tv/${tvId}/images?include_image_language=en,null,xx`,
      apiKey,
    );
    // The main poster from the find step already made: in any language,
    // where /images above keeps only English and textless ones (CRI-100).
    const posterPath = found.tv_results?.[0]?.poster_path ?? null;
    return { tvId, images, posterPath };
  }

  async function externalIdsById(tmdbId: number): Promise<ExternalIds | null> {
    if (!apiKey) {
      return null;
    }
    return tmdbExternalIds(
      await requestJson<TmdbExternalIdsResponse>(
        `/tv/${tmdbId}/external_ids`,
        apiKey,
      ),
    );
  }

  async function suggestTitles(
    query: string,
  ): Promise<SuggestedTitle[] | null> {
    if (!apiKey) {
      return null;
    }
    const answer = await requestJson<{
      results?: { id: number; name: string; original_name?: string | null }[];
    }>(`/search/tv?query=${encodeURIComponent(query)}`, apiKey);
    return (answer.results ?? []).map((result) => ({
      id: result.id,
      name: result.name,
      original_name: result.original_name ?? null,
    }));
  }

  async function findTranslations(
    tmdbId: number,
  ): Promise<TmdbTranslation[] | null> {
    if (!apiKey) {
      return null;
    }
    const answer = await requestJson<{
      translations?: { english_name: string; data?: { name?: string } }[];
    }>(`/tv/${tmdbId}/translations`, apiKey);
    return (answer.translations ?? []).map((translation) => ({
      english_name: translation.english_name,
      name: translation.data?.name ?? "",
    }));
  }

  async function findAiringOn(request: {
    region: string;
    timeZone: string;
    day: string;
  }): Promise<TmdbOnTheAir[] | null> {
    if (!apiKey) {
      return null;
    }
    // Subscription, free and ads (channels included); documentary,
    // miniseries and scripted types (0, 2, 4); no soaps (10766).
    const query = [
      `watch_region=${request.region}`,
      "with_watch_monetization_types=flatrate%7Cfree%7Cads",
      `air_date.gte=${request.day}`,
      `air_date.lte=${request.day}`,
      "with_type=0%7C2%7C4",
      "without_genres=10766",
      "sort_by=popularity.desc",
      `timezone=${encodeURIComponent(request.timeZone)}`,
    ].join("&");
    const page = await requestJson<{ results?: TmdbOnTheAir[] }>(
      `/discover/tv?${query}&page=1`,
      apiKey,
    );
    return page.results ?? [];
  }

  async function providersById(
    tmdbId: number,
    region: string,
  ): Promise<StreamingProvider[] | null> {
    if (!apiKey) {
      return null;
    }
    return regionProviders(
      await requestJson(`/tv/${tmdbId}/watch/providers`, apiKey),
      region,
    );
  }

  return {
    findAiringOn,
    suggestTitles,
    findTranslations,
    providersById,
    findStreamingProviders,
    findOriginCountries,
    findRating,
    findExternalIds,
    findRecommendations,
    findImages,
    externalIdsById,
  };
}

// The app's client: one /find per show for all its lookups, kept in the
// query cache (CRI-107, hooks/tmdb-find-cache.ts).
export const tmdbClient = createTmdbClient({
  apiKey: process.env.EXPO_PUBLIC_TMDB_API_KEY,
  cachedFind: createTmdbFindCache(queryClient),
});
