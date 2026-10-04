// A show's origin countries from TMDB, for Show detail's meta line (FR-028).
// They don't change, so a found answer never goes stale; an empty one (no
// key, or no TMDB match yet) is asked again after a day (CRI-99, CRI-102).

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { tmdbClient, tmdbShowRef } from "@/api/tmdb-client";
import type { TvMazeShow } from "@/api/tvmaze-types";

export function useOriginCountries(show: TvMazeShow): UseQueryResult<string[]> {
  return useQuery({
    // v2: drops empty answers cached before the name match (CRI-99).
    queryKey: ["originCountries", "v2", show.id],
    staleTime: (query) =>
      query.state.data?.length ? Infinity : 24 * 60 * 60 * 1000,
    queryFn: async () =>
      (await tmdbClient.findOriginCountries(tmdbShowRef(show))) ?? [],
  });
}
