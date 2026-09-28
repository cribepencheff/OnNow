// PROTOTYPE (proto/home-backdrop, not for merge): TMDB backdrop, logo and
// episode still for a followed show, per docs/design/design-system.md
// "Imagery". Uses the same EXPO_PUBLIC_TMDB_API_KEY as
// src/api/tmdb-client.ts.
//
// The hero shows the episode's own TMDB still when it has one
// (useEpisodeStill below), falling back to the highest-rated backdrop
// (chooseHighestRatedBackdrop). Both are recomputed on each run; there is
// no longer a stored "official" pick or a re-pick window (removed with the
// /tv/{id}/changes machinery once episode stills were adopted).

import { useQuery } from "@tanstack/react-query";

import type { TvMazeEpisode, TvMazeShowWithEmbeds } from "@/api/tvmaze-types";
import {
  chooseEpisodeStill,
  chooseHighestRatedBackdrop,
  chooseLogo,
  textlessBackdrops,
  type TmdbEpisodeImages,
  type TmdbImage,
  type TmdbImages,
} from "./images";

const KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;

async function tmdb<T>(path: string): Promise<T> {
  if (!KEY) {
    throw new Error("No TMDB key (EXPO_PUBLIC_TMDB_API_KEY)");
  }
  const bearer = KEY.length > 40;
  const separator = path.includes("?") ? "&" : "?";
  const url = `https://api.themoviedb.org/3${path}${bearer ? "" : `${separator}api_key=${KEY}`}`;
  const response = await fetch(
    url,
    bearer ? { headers: { Authorization: `Bearer ${KEY}` } } : undefined,
  );
  if (!response.ok) {
    throw new Error(`TMDB ${response.status} for ${path}`);
  }
  return (await response.json()) as T;
}

async function tmdbTvIdFor(show: TvMazeShowWithEmbeds): Promise<number | null> {
  const { imdb, thetvdb } = show.externals ?? { imdb: null, thetvdb: null };
  for (const [id, source] of [
    [imdb, "imdb_id"],
    [thetvdb, "tvdb_id"],
  ] as const) {
    if (!id) continue;
    const found = await tmdb<{ tv_results?: { id: number }[] }>(
      `/find/${id}?external_source=${source}`,
    );
    if (found.tv_results?.[0]) return found.tv_results[0].id;
  }
  return null;
}

export interface ShowImages {
  tmdbId: number | null;
  // The highest-rated backdrop currently available
  // (chooseHighestRatedBackdrop): the hero's backdrop fallback when an
  // episode has no TMDB still. Recomputed fresh every time this query runs
  // (once a day per show, via todayDate in the query key).
  highestRatedBackdrop: TmdbImage | null;
  // The most and second most voted textless backdrops, and how many textless
  // backdrops exist: shown side by side on the dev images screen to review
  // the ranking (not used by Home itself).
  mostVoted: TmdbImage | null;
  secondMostVoted: TmdbImage | null;
  textlessCount: number;
  logo: TmdbImage | null;
}

export function useShowImages(
  show: TvMazeShowWithEmbeds,
  timeZone: string,
  todayDate: string,
) {
  return useQuery({
    // -v3: bump this suffix whenever ShowImages' shape changes. The cache is
    // persisted to AsyncStorage (onnow.queryCache, hooks/query-client.ts)
    // with staleTime: Infinity and a key that otherwise only changes once a
    // day (todayDate), so an old cached entry from before a shape change can
    // outlive the code that reads it; bumping the version forces a fresh
    // fetch immediately. Bumped to v3 when the stored "official" backdrop
    // pick and its fields (backdrop, airingNow, pickReason, ...) and the
    // /tv/{id}/changes "newest upload" machinery were removed, in favour of
    // episode-still-first with a highest-rated backdrop fallback.
    // useEpisodeStill calls this hook directly for its own tmdbId rather than
    // reading the cache under a hardcoded key, so it picks up whatever
    // version is current here automatically; nothing else in the app reads
    // this key.
    queryKey: ["proto-images-v3", show.id, todayDate],
    staleTime: Infinity,
    // Without a key the lookup cannot work, so say so at once.
    retry: KEY ? 3 : false,
    queryFn: async (): Promise<ShowImages> => {
      const tmdbId = await tmdbTvIdFor(show);
      if (tmdbId === null) {
        return {
          tmdbId,
          highestRatedBackdrop: null,
          mostVoted: null,
          secondMostVoted: null,
          textlessCount: 0,
          logo: null,
        };
      }

      const images = await tmdb<TmdbImages>(
        `/tv/${tmdbId}/images?include_image_language=en,null,xx`,
      );
      const textless = textlessBackdrops(images);

      return {
        tmdbId,
        highestRatedBackdrop: chooseHighestRatedBackdrop(images),
        mostVoted: textless[0] ?? null,
        secondMostVoted: textless[1] ?? null,
        textlessCount: textless.length,
        logo: chooseLogo(images),
      };
    },
  });
}

export interface EpisodeStill {
  filePath: string;
}

// PROTOTYPE (quick experiment, home hero backdrop): tries the episode's
// own TMDB stills before falling back to the show's highest-rated backdrop
// (useShowImages above). Reuses useShowImages purely to get the
// already-resolved tmdbId; TanStack Query dedupes the identical
// ["proto-images-v3", show.id, todayDate] key across both calls (same as
// HeroPage and ContentLayer already share it today), so this never
// double-fetches the show's own images. The still query itself is keyed by
// season/episode number, not todayDate: a released episode's own stills
// don't change day to day the way the show's images can, so there's no
// reason to refetch it on that schedule.
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
