// A followed show's streaming services in the user's region (FR-014,
// FR-017, ADR 0014), looked up once through TMDB and kept per show and
// region in plain storage for 30 days (NFR-005). Only followed shows are
// looked up. The result is null when there is no TMDB key, and is then not
// cached.

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { tmdbClient } from "@/api/tmdb-client";
import { getCachedProviders, saveProviders } from "@/storage/streaming-service";
import type { StreamingProvider } from "@/logic/streaming-service";
import type { TvMazeShow } from "@/api/tvmaze-types";
import { useRegion } from "./useRegion";

export function useStreamingService(
  show: TvMazeShow,
  enabled: boolean,
): UseQueryResult<StreamingProvider[] | null> & { region: string | undefined } {
  const { region } = useRegion();
  const query = useQuery({
    queryKey: ["streamingService", region, show.id],
    enabled: enabled && region !== undefined,
    // The 30 day freshness is decided by the storage, not the query cache.
    staleTime: Infinity,
    queryFn: async () => {
      const now = Date.now();
      const cached = await getCachedProviders(show.id, region!, now);
      if (cached) {
        return cached;
      }
      const providers = await tmdbClient.findStreamingProviders(
        {
          imdb: show.externals?.imdb ?? null,
          thetvdb: show.externals?.thetvdb ?? null,
        },
        region!,
      );
      if (providers !== null) {
        await saveProviders(show.id, region!, providers, now);
      }
      return providers;
    },
  });
  return { ...query, region };
}
