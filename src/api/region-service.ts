// Whether a title has a streaming service in the region (FR-038, FR-039):
// the same rule and the same stored answer as "Open in", keyed by TVmaze id
// and region, so a show already looked up costs nothing. On a miss, one
// TMDB request by its TMDB id, stored for "Open in" too.

import { hasStreamingService } from "@/logic/streaming-service";
import { getCachedProviders, saveProviders } from "@/storage/streaming-service";
import { tmdbClient } from "./tmdb-client";

export async function hasServiceInRegion(
  tvmazeId: number,
  tmdbId: number,
  region: string,
): Promise<boolean> {
  const now = Date.now();
  const cached = await getCachedProviders(tvmazeId, region, now);
  if (Array.isArray(cached)) {
    return hasStreamingService(cached);
  }
  try {
    const providers = await tmdbClient.providersById(tmdbId, region);
    if (providers === null) {
      return false;
    }
    await saveProviders(tvmazeId, region, providers, now);
    return hasStreamingService(providers);
  } catch {
    return false;
  }
}
