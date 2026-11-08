// TMDB's episode stills for the season Show detail's episode row shows
// (CRI-143, owner 2026-11-08): one request per season looked at, through
// the app's TMDB client, so the show's find step is the cached one every
// other TMDB lookup uses (CRI-107). Which image a card draws is decided in
// logic/episode-image.ts. Without a key, or when TMDB does not know the
// show, an empty list: the cards fall back to TVmaze's stills.

import { useQuery } from "@tanstack/react-query";

import { tmdbClient, tmdbShowRef } from "@/api/tmdb-client";
import type { TmdbEpisodeStill } from "@/api/tmdb-types";
import type { TvMazeShow } from "@/api/tvmaze-types";
import { NOT_ON_TMDB } from "@/logic/streaming-service";

const DAY_MS = 24 * 60 * 60 * 1000;

export function useSeasonStills(show: TvMazeShow, season: number | undefined) {
  return useQuery({
    enabled: season !== undefined,
    // A day fresh: a still TMDB adds the day after an episode comes in on
    // the next look after that. Bump this suffix whenever the answer's
    // shape changes.
    queryKey: ["season-stills-v1", show.id, season],
    staleTime: DAY_MS,
    queryFn: async (): Promise<TmdbEpisodeStill[]> => {
      const found = await tmdbClient.findSeasonStills(
        tmdbShowRef(show),
        season as number,
      );
      return found === null || found === NOT_ON_TMDB ? [] : found;
    },
  });
}
