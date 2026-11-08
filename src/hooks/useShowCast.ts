// A show's cast from TVmaze, for Show detail's Cast & Crew row when TMDB
// lists no cast (CRI-143, owner 2026-11-08; TMDB's portraits are more
// current). A request of its own, made only then. Cast lists change
// seldom, so an answer is fresh for a week.

import { useQuery } from "@tanstack/react-query";

import { tvMazeClient } from "@/api/tvmaze-client";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function useShowCast(showId: number, enabled = true) {
  return useQuery({
    enabled,
    // Bump this suffix whenever the answer's shape changes.
    queryKey: ["cast-v1", showId],
    staleTime: WEEK_MS,
    queryFn: () => tvMazeClient.getCast(showId),
  });
}
