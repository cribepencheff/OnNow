// "Top picks for you" (FR-038, ADR 0016). TMDB's recommendations per
// followed show are kept a day; a page of cards is filled once from their
// ranking (fillTopPicks), only titles with a service in the region, and
// then left alone, so following from the row never reshuffles it. A drag
// past the row's end appends the next batch, without followed shows; at
// the end of the ranking, or the row's cap, the row ends (CRI-131). Each
// day the row starts from a different part of the ranking, so shows past
// the cap come first another day (rotateForDay). The batches, and the
// count shared with Search's row (FR-026), are usePosterBatches'.

import { useQueries } from "@tanstack/react-query";

import {
  tmdbClient,
  tmdbShowRef,
  type TmdbRecommendations,
} from "@/api/tmdb-client";
import { hasServiceInRegion } from "@/api/region-service";
import { resolveTvMazeId } from "@/api/tvmaze-id";
import type { TvMazeShow } from "@/api/tvmaze-types";
import { MAX_ROW_CARDS } from "@/logic/poster-batches";
import { rankRecommendations } from "@/logic/recommendations";
import { fillTopPicks, rotateForDay } from "@/logic/top-picks";
import { useFollowList } from "./useFollowList";
import { useHiddenFollowed } from "./useSettledFollowed";
import { usePosterBatches, type PosterBatches } from "./usePosterBatches";
import { useRegion } from "./useRegion";
import { useRowDay } from "./useSettledDay";

const DAY_MS = 24 * 60 * 60 * 1000;
const RECOMMENDATIONS_KEY = ["recommendations", "v1"];
// Pages belong to one launch: the next launch starts from the top again.
const LAUNCH = Date.now();

// An answer with recommendations, not "not on TMDB", no key or loading.
function isFound(data: unknown): data is TmdbRecommendations {
  return typeof data === "object" && data !== null;
}

export function useTopPicks(
  followedShows: TvMazeShow[],
): PosterBatches<object> {
  const { followedIds } = useFollowList();
  const hidden = useHiddenFollowed();
  const { region } = useRegion();
  // The day its screen settled on, not the live clock: a new day never
  // moves the row under the user's finger (useSettledDay).
  const todayDate = useRowDay();
  const answers = useQueries({
    queries: followedShows.map((show) => ({
      queryKey: [...RECOMMENDATIONS_KEY, show.id],
      staleTime: DAY_MS,
      queryFn: () => tmdbClient.findRecommendations(tmdbShowRef(show)),
    })),
  });
  const settled =
    region !== undefined &&
    followedShows.length > 0 &&
    answers.every((query) => !query.isLoading);

  return usePosterBatches({
    // By day: each day the row starts from its own part of the ranking.
    pageKey: (index) => [
      "topPicksPage",
      "v3",
      LAUNCH,
      region,
      todayDate,
      index,
    ],
    // Which batch the rows show, in the query cache so Home and Search
    // share it; a new day starts again from its first batch.
    pageIndexKey: ["topPicksPageIndex", LAUNCH, todayDate],
    enabled: settled,
    fill: (start, size) => {
      const found = answers.map((query) => query.data).filter(isFound);
      const ranking = rankRecommendations(
        found.map(({ results }) => results),
        new Set(found.map(({ tvId }) => tvId)),
        Infinity,
      );
      return fillTopPicks(
        rotateForDay(ranking, todayDate, MAX_ROW_CARDS),
        start,
        size,
        resolveTvMazeId,
        (tvmazeId) => followedIds.has(tvmazeId),
        async (tvmazeId, tmdbId) =>
          (await hasServiceInRegion(tvmazeId, tmdbId, region!)) ? {} : null,
      );
    },
    hidden,
  });
}
