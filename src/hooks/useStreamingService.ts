// A show's streaming services in the user's region (FR-014, FR-017,
// ADR 0014), looked up once through TMDB and kept per show and region in
// plain storage for 30 days (NFR-005). Show detail looks them up for any
// show, followed or not. NOT_ON_TMDB when TMDB does not know the show
// (kept a day, CRI-102); null without a TMDB key, not cached.

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { tmdbClient, tmdbShowRef } from "@/api/tmdb-client";
import { getCachedProviders, saveProviders } from "@/storage/streaming-service";
import type { ProviderAnswer } from "@/logic/streaming-service";
import type { TvMazeShow } from "@/api/tvmaze-types";
import { useRegion } from "./useRegion";

export function useStreamingService(
  show: TvMazeShow,
  enabled: boolean,
): UseQueryResult<ProviderAnswer | null> & { region: string | undefined } {
  const { region } = useRegion();
  const query = useQuery({
    // v2: drops answers persisted before CRI-99, when an unmatched show was
    // stored as "no services" (CRI-102).
    queryKey: ["streamingService", "v2", region, show.id],
    enabled: enabled && region !== undefined,
    // Freshness is decided by the storage (30 days, a day for "not on
    // TMDB"); an hour re-reads it, so its expiry applies in a running app.
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const now = Date.now();
      const cached = await getCachedProviders(show.id, region!, now);
      if (cached) {
        return cached;
      }
      const providers = await tmdbClient.findStreamingProviders(
        tmdbShowRef(show),
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
