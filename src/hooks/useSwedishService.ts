// A followed show's Swedish streaming services (FR-014, CRI-82), looked up
// once through TMDB and kept with the show in plain storage for 30 days
// (NFR-005). Only followed shows are looked up. The result is null when
// there is no TMDB key, and is then not cached.

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { tmdbClient } from "@/api/tmdb-client";
import { getCachedProviders, saveProviders } from "@/storage/streaming-service";
import type { SwedishProvider } from "@/logic/swedish-service";
import type { TvMazeShow } from "@/api/tvmaze-types";

export function useSwedishService(
  show: TvMazeShow,
  enabled: boolean,
): UseQueryResult<SwedishProvider[] | null> {
  return useQuery({
    queryKey: ["swedishService", show.id],
    enabled,
    // The 30 day freshness is decided by the storage, not the query cache.
    staleTime: Infinity,
    queryFn: async () => {
      const now = Date.now();
      const cached = await getCachedProviders(show.id, now);
      if (cached) {
        return cached;
      }
      const providers = await tmdbClient.findSwedishProviders({
        imdb: show.externals?.imdb ?? null,
        thetvdb: show.externals?.thetvdb ?? null,
      });
      if (providers !== null) {
        await saveProviders(show.id, providers, now);
      }
      return providers;
    },
  });
}
