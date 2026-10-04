// Followed shows with an episode today, and the episodes of the next day
// with any when today is empty (FR-004, FR-006, ADR 0009). Reads the follow
// list from its own storage, then queries each followed show.

import { useMemo } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";

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
import { SHOW_STALE_TIME_MS } from "./query-client";
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

  const showQueries = useQueries({
    queries: followedIds.map((showId) => ({
      queryKey: showQueryKey(showId),
      queryFn: () => tvMazeClient.getShowWithEpisodesAndSeasons(showId),
      staleTime: SHOW_STALE_TIME_MS,
    })),
  });

  const isLoading =
    followedIdsQuery.isLoading || showQueries.some((query) => query.isLoading);
  const isRefetching =
    followedIdsQuery.isRefetching ||
    showQueries.some((query) => query.isRefetching);

  const dataUpdatedAt = useMemo(() => {
    const timestamps = showQueries
      .map((query) => query.dataUpdatedAt)
      .filter((timestamp): timestamp is number => Boolean(timestamp));

    if (timestamps.length === 0) {
      return null;
    }

    return Math.min(...timestamps);
  }, [showQueries]);

  const loadedShows = useMemo(
    () =>
      showQueries
        .map((query) => query.data)
        .filter((show): show is NonNullable<typeof show> => Boolean(show)),
    [showQueries],
  );

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
    loadedShows.length === 0 &&
    followedIds.length > 0 &&
    showQueries.some((query) => query.isError);

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

  // CRI-85: a pull refetches only shows older than SHOW_STALE_TIME_MS,
  // judged now rather than at the last render; a pull right after another
  // has nothing to fetch. The follow list is local, so it is always reread.
  async function refetch(): Promise<void> {
    const { data: ids = [] } = await followedIdsQuery.refetch();
    await Promise.all(
      ids.map((showId) => {
        const query = queryClient
          .getQueryCache()
          .find({ queryKey: showQueryKey(showId), exact: true });
        return !query || query.isStaleByTime(SHOW_STALE_TIME_MS)
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
    anyShowLoading: showQueries.some((query) => query.isLoading),
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
