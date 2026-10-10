// "Top picks for you" (FR-038, ADR 0016). TMDB's recommendations per
// followed show are kept a day; a page of cards is filled once from their
// ranking (fillTopPicks), only titles with a service in the region, and
// then left alone, so following from the row never reshuffles it. A drag
// past the row's end appends the next batch, without followed shows; at
// the end of the ranking the row ends (CRI-131). The batches, and the
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
import { rankRecommendations } from "@/logic/recommendations";
import { fillTopPicks } from "@/logic/top-picks";
import { useFollowList } from "./useFollowList";
import { useHiddenFollowed } from "./useSettledFollowed";
import { usePosterBatches, type PosterBatches } from "./usePosterBatches";
import { useRegion } from "./useRegion";

const DAY_MS = 24 * 60 * 60 * 1000;
const RECOMMENDATIONS_KEY = ["recommendations", "v1"];
// Pages belong to one launch: the next launch starts from the top again.
const LAUNCH = Date.now();
// Which page the rows show, in the query cache so Home and Search share it.
const PAGE_INDEX_KEY = ["topPicksPageIndex", LAUNCH];

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
    pageKey: (index) => ["topPicksPage", "v2", LAUNCH, region, index],
    pageIndexKey: PAGE_INDEX_KEY,
    enabled: settled,
    fill: (start, size) => {
      const found = answers.map((query) => query.data).filter(isFound);
      const ranking = rankRecommendations(
        found.map(({ results }) => results),
        new Set(found.map(({ tvId }) => tvId)),
        Infinity,
      );
      return fillTopPicks(
        ranking,
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
