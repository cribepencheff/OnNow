// One query per followed show, keyed by its TVmaze show ID (ADR 0009).

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { tvMazeClient } from "@/api/tvmaze-client";
import type { TvMazeShowWithEmbeds } from "@/api/tvmaze-types";
import { showStaleTime } from "@/logic/show-staleness";

export function showQueryKey(showId: number): readonly unknown[] {
  return ["show", showId] as const;
}

export function useShow(showId: number): UseQueryResult<TvMazeShowWithEmbeds> {
  return useQuery({
    queryKey: showQueryKey(showId),
    queryFn: () => tvMazeClient.getShowWithEpisodesAndSeasons(showId),
    // The same freshness as Home's queries for the same key, so opening
    // Show detail does not refetch an ended show Home keeps a week.
    staleTime: (query) => showStaleTime(query.state.data),
  });
}
