// One query per followed show, keyed by its TVmaze show ID (ADR 0009).
// Views read `dataUpdatedAt` to show when the data was last refreshed
// (NFR-002).

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { tvMazeClient } from "@/api/tvmaze-client";
import type { TvMazeShowWithEmbeds } from "@/api/tvmaze-types";

export function showQueryKey(showId: number): readonly unknown[] {
  return ["show", showId] as const;
}

export function useShow(showId: number): UseQueryResult<TvMazeShowWithEmbeds> {
  return useQuery({
    queryKey: showQueryKey(showId),
    queryFn: () => tvMazeClient.getShowWithEpisodesAndSeasons(showId),
  });
}
