// Tries the episode's own TMDB stills before falling back to the show's
// highest-rated backdrop (useShowImages, src/hooks/useShowImages.ts).
// Reuses useShowImages purely to get the already-resolved tmdbId;
// TanStack Query dedupes the identical ["proto-images-v4", show.id,
// todayDate] key across both calls (same as HeroPage and ContentLayer
// already share it), so this never double-fetches the show's own images.
// The still query itself is keyed by season/episode number, not todayDate:
// a released episode's own stills don't change day to day the way the
// show's images can, so there's no reason to refetch it on that schedule.

import { useQuery } from "@tanstack/react-query";

import type { TvMazeEpisode, TvMazeShowWithEmbeds } from "@/api/tvmaze-types";
import type { TmdbEpisodeImages } from "@/api/tmdb-types";
import { chooseEpisodeStill } from "@/logic/hero-images";
import { tmdb, useShowImages } from "./useShowImages";

const KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;

export interface EpisodeStill {
  filePath: string;
}

export function useEpisodeStill(
  show: TvMazeShowWithEmbeds,
  episode: TvMazeEpisode,
  timeZone: string,
  todayDate: string,
) {
  const { data: showImages } = useShowImages(show, timeZone, todayDate);
  const tmdbId = showImages?.tmdbId ?? null;

  return useQuery({
    queryKey: ["proto-episode-still", show.id, episode.season, episode.number],
    staleTime: Infinity,
    // Regular episodes always have a number (FR-037, no specials); null
    // here would only mean this episode somehow slipped through that.
    enabled: tmdbId !== null && episode.number !== null,
    retry: KEY ? 3 : false,
    queryFn: async (): Promise<EpisodeStill | null> => {
      if (tmdbId === null || episode.number === null) {
        return null;
      }
      const images = await tmdb<TmdbEpisodeImages>(
        `/tv/${tmdbId}/season/${episode.season}/episode/${episode.number}/images`,
      );
      const still = chooseEpisodeStill(images);
      return still ? { filePath: still.file_path } : null;
    },
  });
}
