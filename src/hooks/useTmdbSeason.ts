// TMDB's episodes for a season, with their stills and overviews, and the
// season's videos for the Trailers row (ADR 0021) (CRI-143, owner 2026-11-08): one request per
// season looked at, through the app's TMDB client, so the show's find step
// is the cached one every other TMDB lookup uses (CRI-107). A card's image
// is decided in logic/episode-image.ts, its text in logic/tmdb-episode.ts.
// Without a key, or when TMDB does not know the show, an empty list: the
// cards keep TVmaze's stills and summaries.

import { useQuery } from "@tanstack/react-query";

import { tmdbClient, tmdbShowRef } from "@/api/tmdb-client";
import type { TmdbSeason } from "@/api/tmdb-types";
import type { TvMazeShow } from "@/api/tvmaze-types";
import { NOT_ON_TMDB } from "@/logic/streaming-service";

const DAY_MS = 24 * 60 * 60 * 1000;

export function useTmdbSeason(show: TvMazeShow, season: number | undefined) {
  return useQuery({
    enabled: season !== undefined,
    // A day fresh: a still or overview TMDB adds the day after an episode
    // comes in on the next look after that. Bump this suffix whenever the
    // answer's shape changes. v2: { episodes, videos } (ADR 0021).
    // tmdb-season-v1 replaced season-stills-v1, whose answers had no
    // overviews.
    queryKey: ["tmdb-season-v2", show.id, season],
    staleTime: DAY_MS,
    queryFn: async (): Promise<TmdbSeason> => {
      const found = await tmdbClient.findSeason(
        tmdbShowRef(show),
        season as number,
      );
      return found === null || found === NOT_ON_TMDB
        ? { episodes: [], videos: [] }
        : found;
    },
  });
}
