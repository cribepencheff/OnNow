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
import type { TvMazeShowWithEmbeds } from "@/api/tvmaze-types";
import type { TmdbImage } from "@/api/tmdb-types";
import {
  chooseHighestRatedBackdrop,
  chooseLogo,
  textlessBackdrops,
} from "@/logic/hero-images";
import { NOT_ON_TMDB } from "@/logic/streaming-service";

const HAS_KEY = Boolean(process.env.EXPO_PUBLIC_TMDB_API_KEY);

export interface ShowImages {
  tmdbId: number | null;
  // The highest-rated backdrop currently available
  // (chooseHighestRatedBackdrop): the hero's image. Recomputed fresh every
  // time this query runs
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
    // Nothing else in the app reads this key.
    // v4: drops "no TMDB match" answers cached before the name match (CRI-99).
    queryKey: ["proto-images-v4", show.id, todayDate],
    staleTime: Infinity,
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
        };
      }
      const { tvId, images } = found;
      const textless = textlessBackdrops(images);
      return {
        tmdbId: tvId,
        highestRatedBackdrop: chooseHighestRatedBackdrop(images),
        mostVoted: textless[0] ?? null,
        secondMostVoted: textless[1] ?? null,
        textlessCount: textless.length,
        logo: chooseLogo(images),
      };
    },
  });
}
