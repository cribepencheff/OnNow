// A TMDB show's TVmaze id: from storage when known, else TMDB's external IDs
// and a TVmaze lookup, then stored (FR-038). Without a TMDB key, or when a
// request fails, nothing is stored and the title is skipped for now.

import { getCachedTvMazeId, saveTvMazeId } from "@/storage/tvmaze-id";
import { tmdbClient } from "./tmdb-client";
import { tvMazeClient } from "./tvmaze-client";

export async function resolveTvMazeId(tmdbId: number): Promise<number | null> {
  const now = Date.now();
  const cached = await getCachedTvMazeId(tmdbId, now);
  if (cached !== undefined) {
    return cached;
  }
  try {
    const ids = await tmdbClient.externalIdsById(tmdbId);
    if (ids === null) {
      return null;
    }
    const tvmazeId = await tvMazeClient.lookupShowId(ids);
    await saveTvMazeId(tmdbId, tvmazeId, now);
    return tvmazeId;
  } catch {
    return null;
  }
}
