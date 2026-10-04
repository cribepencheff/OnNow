// A show's IMDb rating through OMDb (CRI-87, ADR 0013), looked up when
// the rating is shown, kept per show for a week, or a day when OMDb has
// none yet (CRI-92). null means no rating to show: no IMDb ID, no key, or
// OMDb has none.

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { omdbClient } from "@/api/omdb-client";
import { getCachedRating, saveRating } from "@/storage/imdb-rating";
import type { TvMazeShow } from "@/api/tvmaze-types";

export function useImdbRating(show: TvMazeShow): UseQueryResult<string | null> {
  const imdbId = show.externals?.imdb ?? null;
  return useQuery({
    queryKey: ["imdbRating", show.id],
    enabled: imdbId !== null,
    // Freshness is decided by the storage; an hour re-reads it so a long
    // running app still picks up a rating once the day's "no rating" expires.
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const now = Date.now();
      const cached = await getCachedRating(show.id, now);
      if (cached !== undefined) {
        return cached;
      }
      const result = await omdbClient.findImdbRating(imdbId!);
      if (result === null) {
        return null;
      }
      await saveRating(show.id, result.rating, now);
      return result.rating;
    },
  });
}
