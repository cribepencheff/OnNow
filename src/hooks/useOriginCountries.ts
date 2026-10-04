// A show's origin countries from TMDB, for Show detail's meta line (FR-028).
// They don't change, so the query never goes stale; [] without a key.

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { tmdbClient } from "@/api/tmdb-client";
import type { TvMazeShow } from "@/api/tvmaze-types";

export function useOriginCountries(show: TvMazeShow): UseQueryResult<string[]> {
  return useQuery({
    queryKey: ["originCountries", show.id],
    staleTime: Infinity,
    queryFn: async () =>
      (await tmdbClient.findOriginCountries({
        imdb: show.externals?.imdb ?? null,
        thetvdb: show.externals?.thetvdb ?? null,
      })) ?? [],
  });
}
