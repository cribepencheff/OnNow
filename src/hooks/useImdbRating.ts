// A show's IMDb rating through OMDb (CRI-87, ADR 0013), looked up when
// Show detail opens and kept per show for a week. null means no rating to
// show: no IMDb ID, no key, or OMDb has none.

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { omdbClient } from "@/api/omdb-client";
import { getCachedRating, saveRating } from "@/storage/imdb-rating";
import type { TvMazeShow } from "@/api/tvmaze-types";

export function useImdbRating(show: TvMazeShow): UseQueryResult<string | null> {
  const imdbId = show.externals?.imdb ?? null;
  return useQuery({
    queryKey: ["imdbRating", show.id],
    enabled: imdbId !== null,
    // The week of freshness is decided by the storage, not the query cache.
    staleTime: Infinity,
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
