// The show's TMDB rating (ADR 0019), for Show detail and a Search row's
// poster. Read from the find answer every TMDB lookup starts from, which
// is cached (tmdb-find-cache), so it costs no request of its own when the
// show's services or images were looked up. Asked again after a day, so a
// rating that moves, or a show that gets enough votes, shows.

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { tmdbClient, tmdbShowRef } from "@/api/tmdb-client";
import type { TvMazeShow } from "@/api/tvmaze-types";
import type { TmdbRating } from "@/logic/show-rating";

const DAY_MS = 24 * 60 * 60 * 1000;

export function useTmdbRating(
  show: TvMazeShow,
): UseQueryResult<TmdbRating | null> {
  return useQuery({
    queryKey: ["tmdbRating", "v1", show.id],
    staleTime: DAY_MS,
    queryFn: () => tmdbClient.findRating(tmdbShowRef(show)),
  });
}
