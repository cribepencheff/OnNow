// Followed shows with an episode today, and the next upcoming episode when
// today is empty (FR-004, FR-006, ADR 0009). Reads the follow list from its
// own storage, then queries each followed show.

import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";

import { tvMazeClient } from "@/api/tvmaze-client";
import { getFollowedIds } from "@/storage/follow-list";
import {
  findShowsWithEpisodeToday,
  type ShowEpisodesToday,
} from "@/logic/episodes-today";
import { nextForShow, type NextForShow } from "@/logic/next-episode";
import type { TvMazeEpisode, TvMazeShowWithEmbeds } from "@/api/tvmaze-types";
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
  isLoading: boolean;
  isRefetching: boolean;
  dataUpdatedAt: number | null;
  followedShows: FollowedShowEpisodes[];
  showsWithEpisodeToday: ShowEpisodesToday[];
  nextByShow: FollowedShowNext[];
  refetch: () => Promise<void>;
}

function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function useFollowedEpisodes(): FollowedEpisodesResult {
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

  const showsWithEpisodeToday = useMemo(
    () => findShowsWithEpisodeToday(followedShows, timeZone, todayDate),
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

  async function refetch(): Promise<void> {
    await followedIdsQuery.refetch();
    await Promise.all(showQueries.map((query) => query.refetch()));
  }

  return {
    isLoading,
    isRefetching,
    dataUpdatedAt,
    followedShows,
    showsWithEpisodeToday,
    nextByShow,
    refetch,
  };
}
