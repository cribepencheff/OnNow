// TMDB backdrop and logo for a followed show, per
// docs/design/design-system.md "Imagery". Through the app's TMDB client
// (api/tmdb-client.ts), so its find step is the same cached /find every
// other TMDB lookup for the show uses (CRI-107), rather than a helper of
// its own that found the show again every day.
//
// The hero shows the show's highest-rated backdrop
// (chooseHighestRatedBackdrop, ADR 0012 as amended for CRI-124),
// recomputed on each run; there is no stored "official" pick or re-pick
// window (removed with the /tv/{id}/changes machinery).

import { useQuery } from "@tanstack/react-query";

import { tmdbClient, tmdbShowRef } from "@/api/tmdb-client";
import type { TvMazeShow } from "@/api/tvmaze-types";
import type { TmdbImage } from "@/api/tmdb-types";
import {
  chooseHighestRatedBackdrop,
  chooseLogo,
  textlessBackdrops,
} from "@/logic/hero-images";
import { NOT_ON_TMDB } from "@/logic/streaming-service";
import { KEEP_MS } from "./query-client";

const HAS_KEY = Boolean(process.env.EXPO_PUBLIC_TMDB_API_KEY);
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ShowImages {
  tmdbId: number | null;
  // The highest-rated backdrop currently available
  // (chooseHighestRatedBackdrop): the hero's image. Recomputed fresh every
  // time this query runs (showImagesStaleTime).
  highestRatedBackdrop: TmdbImage | null;
  // The most and second most voted textless backdrops, and how many textless
  // backdrops exist: shown side by side on the dev images screen to review
  // the ranking (not used by Home itself).
  mostVoted: TmdbImage | null;
  secondMostVoted: TmdbImage | null;
  textlessCount: number;
  logo: TmdbImage | null;
  // TMDB's main poster (CRI-100): a fallback where a show has no backdrop,
  // and for a list's poster where TVmaze has none.
  posterPath: string | null;
}

// How long an answer is fresh (ADR 0017, owner 2026-10-22): a week when
// the show has a backdrop, since a new top-voted one is no hurry; a day
// when it has none (a poster or nothing, often a show just out), so its
// backdrop comes in soon after TMDB gets one.
export function showImagesStaleTime(data: ShowImages | undefined): number {
  return data?.highestRatedBackdrop ? 7 * DAY_MS : DAY_MS;
}

export function useShowImages(
  show: TvMazeShow,
  // A list asks only when TVmaze has no poster (useListPoster).
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    enabled: options.enabled ?? true,
    // Refreshed weekly, or daily without a backdrop (showImagesStaleTime),
    // kept and saved 21 days (ADR 0017): after time away the hero shows
    // the images it had at once, replaced if TMDB's now differ. Bump this
    // suffix whenever ShowImages' shape changes, since answers are kept.
    // v6: posterPath added (CRI-100). v5: the key no longer carries the
    // day (v4 did, which meant a new fetch, and no image meanwhile, on
    // every new day).
    // Earlier: v3 dropped the stored "official" backdrop pick, v4 the "no
    // TMDB match" answers from before the name match (CRI-99).
    queryKey: ["hero-images-v6", show.id],
    staleTime: (query) => showImagesStaleTime(query.state.data),
    gcTime: KEEP_MS,
    // Without a key the lookup cannot work, so say so at once.
    retry: HAS_KEY ? 3 : false,
    queryFn: async (): Promise<ShowImages> => {
      const found = await tmdbClient.findImages(tmdbShowRef(show));
      if (found === null) {
        // As before: without a key there is no answer to keep.
        throw new Error("No TMDB key (EXPO_PUBLIC_TMDB_API_KEY)");
      }
      if (found === NOT_ON_TMDB) {
        return {
          tmdbId: null,
          highestRatedBackdrop: null,
          mostVoted: null,
          secondMostVoted: null,
          textlessCount: 0,
          logo: null,
          posterPath: null,
        };
      }
      const { tvId, images, posterPath } = found;
      const textless = textlessBackdrops(images);
      return {
        tmdbId: tvId,
        highestRatedBackdrop: chooseHighestRatedBackdrop(images),
        mostVoted: textless[0] ?? null,
        secondMostVoted: textless[1] ?? null,
        textlessCount: textless.length,
        logo: chooseLogo(images),
        posterPath,
      };
    },
  });
}
