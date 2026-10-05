// "Top picks for you" (FR-038, ADR 0016). TMDB's recommendations per
// followed show are kept a day; a page of cards is filled once from their
// ranking (fillTopPicks), only titles with a service in the region, and
// then left alone, so following from the row never reshuffles it. Refresh
// fills the next page, without followed shows.

import { useState } from "react";
import {
  keepPreviousData,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  tmdbClient,
  tmdbShowRef,
  type TmdbRecommendations,
} from "@/api/tmdb-client";
import { hasServiceInRegion } from "@/api/region-service";
import { resolveTvMazeId } from "@/api/tvmaze-id";
import type { TvMazeShow } from "@/api/tvmaze-types";
import { rankRecommendations } from "@/logic/recommendations";
import { fillTopPicks, type FilledPage, type TopPick } from "@/logic/top-picks";
import { useFollowList } from "./useFollowList";
import { useRegion } from "./useRegion";

const DAY_MS = 24 * 60 * 60 * 1000;
export const ROW_SIZE = 10;
const RECOMMENDATIONS_KEY = ["recommendations", "v1"];
// Pages belong to one launch: the next launch starts from the top again.
const LAUNCH = Date.now();

// An answer with recommendations, not "not on TMDB", no key or loading.
function isFound(data: unknown): data is TmdbRecommendations {
  return typeof data === "object" && data !== null;
}

export function useTopPicks(followedShows: TvMazeShow[]): {
  cards: TopPick[];
  // No page yet: the row keeps its space (CRI-110).
  isLoading: boolean;
  refresh: () => Promise<void>;
  isRefreshing: boolean;
} {
  const queryClient = useQueryClient();
  const { followedIds } = useFollowList();
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

  const [pageIndex, setPageIndex] = useState(0);
  const page = useQuery({
    queryKey: ["topPicksPage", LAUNCH, region, pageIndex],
    enabled: settled,
    staleTime: Infinity,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<FilledPage> => {
      const found = answers.map((query) => query.data).filter(isFound);
      const ranking = rankRecommendations(
        found.map(({ results }) => results),
        new Set(found.map(({ tvId }) => tvId)),
        Infinity,
      );
      const previous = queryClient.getQueryData<FilledPage>([
        "topPicksPage",
        LAUNCH,
        region,
        pageIndex - 1,
      ]);
      return fillTopPicks(
        ranking,
        previous?.nextStart ?? 0,
        ROW_SIZE,
        resolveTvMazeId,
        (tvmazeId) => followedIds.has(tvmazeId),
        async (tvmazeId, tmdbId) =>
          (await hasServiceInRegion(tvmazeId, tmdbId, region!)) ? {} : null,
      );
    },
  });

  // Daily data is fetched again only when a day old, judged now rather
  // than at the last render; then the next page.
  async function refresh(): Promise<void> {
    await queryClient.refetchQueries({
      queryKey: RECOMMENDATIONS_KEY,
      predicate: (query) => query.isStaleByTime(DAY_MS),
    });
    setPageIndex((index) => index + 1);
  }

  return {
    cards: page.data?.cards ?? [],
    isLoading: page.data === undefined && !page.isError,
    refresh,
    isRefreshing: page.isFetching,
  };
}
