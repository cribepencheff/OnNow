// "Top picks for you" (FR-038, ADR 0016). TMDB's recommendations per
// followed show are kept a day; a page of cards is filled once from their
// ranking (fillTopPicks), only titles with a service in the region, and
// then left alone, so following from the row never reshuffles it. Refresh
// fills the next page, without followed shows; at the end of the ranking
// the control reads "Start over" and goes back to the top, minus followed
// shows (logic/poster-batches.ts, CRI-123). The page number is shared
// by every row on screen, so Refresh in Search also moves Home's row
// (FR-026).

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
import {
  nextBatch,
  type Batch,
  type BatchControl,
} from "@/logic/poster-batches";
import { fillTopPicks, type PosterItem } from "@/logic/top-picks";
import { useFollowList } from "./useFollowList";
import { useRegion } from "./useRegion";

const DAY_MS = 24 * 60 * 60 * 1000;
export const ROW_SIZE = 10;
const RECOMMENDATIONS_KEY = ["recommendations", "v1"];
// Pages belong to one launch: the next launch starts from the top again.
const LAUNCH = Date.now();
// Which page the rows show, in the query cache so Home and Search share it.
const PAGE_INDEX_KEY = ["topPicksPageIndex", LAUNCH];

// An answer with recommendations, not "not on TMDB", no key or loading.
function isFound(data: unknown): data is TmdbRecommendations {
  return typeof data === "object" && data !== null;
}

export function useTopPicks(followedShows: TvMazeShow[]): {
  cards: PosterItem[];
  // No page yet: the row keeps its space (CRI-110).
  isLoading: boolean;
  refresh: () => Promise<void>;
  isRefreshing: boolean;
  // "Refresh" or "Start over" (CRI-123).
  control: BatchControl;
  // Empty because every pick is followed.
  allFollowed: boolean;
  // Which batch is on screen; a new one crossfades in.
  batch: number;
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

  const { data: pageIndex = 0 } = useQuery({
    queryKey: PAGE_INDEX_KEY,
    queryFn: () => 0,
    initialData: 0,
    staleTime: Infinity,
  });
  const page = useQuery({
    queryKey: ["topPicksPage", "v2", LAUNCH, region, pageIndex],
    enabled: settled,
    staleTime: Infinity,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<Batch> => {
      const found = answers.map((query) => query.data).filter(isFound);
      const ranking = rankRecommendations(
        found.map(({ results }) => results),
        new Set(found.map(({ tvId }) => tvId)),
        Infinity,
      );
      const previous = queryClient.getQueryData<Batch>([
        "topPicksPage",
        "v2",
        LAUNCH,
        region,
        pageIndex - 1,
      ]);
      return nextBatch(previous, (start) =>
        fillTopPicks(
          ranking,
          start,
          ROW_SIZE,
          resolveTvMazeId,
          (tvmazeId) => followedIds.has(tvmazeId),
          async (tvmazeId, tmdbId) =>
            (await hasServiceInRegion(tvmazeId, tmdbId, region!)) ? {} : null,
        ),
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
    queryClient.setQueryData<number>(PAGE_INDEX_KEY, (index = 0) => index + 1);
  }

  return {
    cards: page.data?.cards ?? [],
    isLoading: page.data === undefined && !page.isError,
    refresh,
    isRefreshing: page.isFetching,
    control: page.data?.control ?? "refresh",
    allFollowed: page.data?.allFollowed ?? false,
    batch: page.data?.index ?? 0,
  };
}
