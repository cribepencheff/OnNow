// Followed shows with an episode today, and the episodes of the next day
// with any when today is empty (FR-004, FR-006, ADR 0009). Reads the follow
// list from its own storage, then queries each followed show.

import { useMemo } from "react";
import {
  useQueries,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";

import { tvMazeClient } from "@/api/tvmaze-client";
import { getFollowedIds } from "@/storage/follow-list";
import {
  findShowsWithEpisodeToday,
  type ShowEpisodesToday,
} from "@/logic/episodes-today";
import { findNextDayWithEpisodes, type NextDayEpisodes } from "@/logic/home";
import { homeIsReady } from "@/logic/launch";
import { nextForShow, type NextForShow } from "@/logic/next-episode";
import type { TvMazeEpisode, TvMazeShowWithEmbeds } from "@/api/tvmaze-types";
import {
  isInHeroWeek,
  showStaleTime,
  type StaleShow,
} from "@/logic/show-staleness";
import { KEEP_MS } from "./query-client";
import { showQueryKey } from "./useShow";
import { useToday } from "./useToday";

export interface FollowedShowNext {
  showId: number;
  next: NextForShow;
}

export interface FollowedShowEpisodes {
  show: TvMazeShowWithEmbeds;
  episodes: TvMazeEpisode[];
}

export interface FollowedEpisodesResult {
  followedCount: number;
  // Cached shows are on screen, or the first fetch has settled (CRI-95).
  isReady: boolean;
  isLoading: boolean;
  isRefetching: boolean;
  isError: boolean;
  dataUpdatedAt: number | null;
  followedShows: FollowedShowEpisodes[];
  showsWithEpisodeToday: ShowEpisodesToday[];
  nextDayEpisodes: NextDayEpisodes | null;
  nextByShow: FollowedShowNext[];
  refetch: () => Promise<void>;
}

// What the hook needs from the followed shows' queries, as one value.
// Module-level, so its identity never changes: TanStack then keeps the
// combined value itself while it stays deep-equal (replaceEqualDeep), so
// loadedShows, and everything derived from it below and on Home, keeps
// its identity across renders instead of being rebuilt on every one, as
// it was when derived from useQueries' own result array, which is new on
// every render (CRI-137).
function combineShowQueries(results: UseQueryResult<TvMazeShowWithEmbeds>[]) {
  const timestamps = results
    .map((query) => query.dataUpdatedAt)
    .filter((timestamp): timestamp is number => Boolean(timestamp));
  return {
    loadedShows: results
      .map((query) => query.data)
      .filter((show): show is TvMazeShowWithEmbeds => Boolean(show)),
    dataUpdatedAt: timestamps.length === 0 ? null : Math.min(...timestamps),
    anyLoading: results.some((query) => query.isLoading),
    anyRefetching: results.some((query) => query.isRefetching),
    anyError: results.some((query) => query.isError),
  };
}

function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function useFollowedEpisodes(): FollowedEpisodesResult {
  const queryClient = useQueryClient();
  const todayDate = useToday();
  const timeZone = deviceTimeZone();

  const followedIdsQuery = useQuery({
    queryKey: ["followedIds"],
    queryFn: getFollowedIds,
  });

  const followedIds = followedIdsQuery.data ?? [];

  const shows = useQueries({
    queries: followedIds.map((showId) => ({
      queryKey: showQueryKey(showId),
      queryFn: () => tvMazeClient.getShowWithEpisodesAndSeasons(showId),
      // An hour, or about a week for an ended show (CRI-107).
      staleTime: (query: { state: { data?: { status?: string } } }) =>
        showStaleTime(query.state.data),
      // Kept, and saved, 21 days (ADR 0017).
      gcTime: KEEP_MS,
    })),
    combine: combineShowQueries,
  });
  const { loadedShows, dataUpdatedAt } = shows;

  const isLoading = followedIdsQuery.isLoading || shows.anyLoading;
  const isRefetching = followedIdsQuery.isRefetching || shows.anyRefetching;

  const followedShows = useMemo(
    () =>
      loadedShows.map((show) => ({
        show,
        episodes: show._embedded.episodes,
      })),
    [loadedShows],
  );

  // Nothing loaded at all, with at least one followed show that failed to
  // fetch: a genuine error, not just "nothing upcoming" (data first). A
  // failed background refetch with prior data is not an error state; the
  // prior data in `loadedShows` is shown instead.
  const isError =
    loadedShows.length === 0 && followedIds.length > 0 && shows.anyError;

  const showsWithEpisodeToday = useMemo(
    () => findShowsWithEpisodeToday(followedShows, timeZone, todayDate),
    [followedShows, timeZone, todayDate],
  );

  const nextDayEpisodes = useMemo(
    () => findNextDayWithEpisodes(followedShows, timeZone, todayDate),
    [followedShows, timeZone, todayDate],
  );

  const showsWithEpisodeTodayIds = useMemo(
    () => new Set(showsWithEpisodeToday.map(({ show }) => show.id)),
    [showsWithEpisodeToday],
  );

  const nextByShow = useMemo(
    () =>
      loadedShows
        .filter((show) => !showsWithEpisodeTodayIds.has(show.id))
        .map((show) => ({
          showId: show.id,
          next: nextForShow(
            show,
            show._embedded.episodes,
            show._embedded.seasons,
            timeZone,
            todayDate,
          ),
        })),
    [loadedShows, showsWithEpisodeTodayIds, timeZone, todayDate],
  );

  // A pull is the user asking for news (ADR 0017 amendment, owner
  // 2026-10-22): it refetches every show in the hero's week at once, and
  // any other show only once stale by now (a week: showStaleTime), judged
  // now rather than at the last render (CRI-85). The follow list is local,
  // so it is always reread.
  async function refetch(): Promise<void> {
    const { data: ids = [] } = await followedIdsQuery.refetch();
    await Promise.all(
      ids.map((showId) => {
        const query = queryClient
          .getQueryCache()
          .find({ queryKey: showQueryKey(showId), exact: true });
        const data = query?.state.data as StaleShow | undefined;
        return !query ||
          !data ||
          isInHeroWeek(data) ||
          query.isStaleByTime(showStaleTime(data))
          ? queryClient.refetchQueries({
              queryKey: showQueryKey(showId),
              exact: true,
            })
          : undefined;
      }),
    );
  }

  const isReady = homeIsReady({
    followedIdsKnown: followedIdsQuery.isSuccess,
    followedCount: followedIds.length,
    loadedCount: loadedShows.length,
    anyShowLoading: shows.anyLoading,
  });

  return {
    followedCount: followedIds.length,
    isReady,
    isLoading,
    isRefetching,
    isError,
    dataUpdatedAt,
    followedShows,
    showsWithEpisodeToday,
    nextDayEpisodes,
    nextByShow,
    refetch,
  };
}
