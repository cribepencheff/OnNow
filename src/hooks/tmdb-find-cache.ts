// One TMDB /find per show, in the query cache (CRI-107). Every TMDB lookup
// for a followed show (its services, origin countries, rating, external
// IDs, recommendations and images) starts from this same find step, and each
// used to make its own request on every fetch: the hero's images daily,
// the "Open in" services hourly. The answer, which TMDB show this is, hardly
// changes, so a hit is kept for 30 days; a miss ("not on TMDB") only for a
// day, so a show TMDB adds later is still found (as useShowExternals keeps
// its own answers). The app's TMDB client is given this cache
// (api/tmdb-client.ts); a client without one finds every time.

import type { QueryClient } from "@tanstack/react-query";

import type { CachedFind, TmdbShowRef } from "@/api/tmdb-client";
import { tmdbTvId, type TmdbFindResponse } from "@/logic/streaming-service";

const DAY_MS = 24 * 60 * 60 * 1000;
const FOUND_STALE_MS = 30 * DAY_MS;
const MISS_STALE_MS = DAY_MS;

// A show by its IDs when it has any, as the find step looks it up; by name
// and premiere only without them (the name search, CRI-99).
export function tmdbFindKey(show: TmdbShowRef): unknown[] {
  return show.imdb || show.thetvdb
    ? ["tmdbFind", "v1", show.imdb, show.thetvdb]
    : ["tmdbFind", "v1", null, null, show.name, show.premiered];
}

export function createTmdbFindCache(queryClient: QueryClient): CachedFind {
  return (show, find) =>
    queryClient.fetchQuery<TmdbFindResponse>({
      queryKey: tmdbFindKey(show),
      queryFn: find,
      staleTime: (query) =>
        query.state.data && tmdbTvId(query.state.data) !== null
          ? FOUND_STALE_MS
          : MISS_STALE_MS,
      // Never dropped for being unused. Not FOUND_STALE_MS: a timer delay
      // past 2^31 - 1 ms (about 24.8 days) overflows and fires at once, so
      // a 30-day gcTime would drop the entry right away. The entries are a
      // few hundred bytes per show.
      gcTime: Infinity,
    });
}
