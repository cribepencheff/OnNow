// "Airing this week" (FR-039, ADR 0016). TMDB's on-the-air list is kept a
// day; a page of cards is filled once per launch in popularity order
// (fillTopPicks) and left alone, so following from the row keeps the card.

import { useQuery } from "@tanstack/react-query";

import { tmdbClient } from "@/api/tmdb-client";
import { tvMazeClient } from "@/api/tvmaze-client";
import { resolveTvMazeId } from "@/api/tvmaze-id";
import { airingThisWeek, weekDayWord } from "@/logic/airing-this-week";
import { localDateFromAirstamp } from "@/logic/local-date";
import { fillTopPicks, type TopPick } from "@/logic/top-picks";
import { useFollowList } from "./useFollowList";
import { useToday } from "./useToday";
import { ROW_SIZE } from "./useTopPicks";

const DAY_MS = 24 * 60 * 60 * 1000;
const LAUNCH = Date.now();

function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function useAiringThisWeek(): TopPick[] {
  const { followedIds, isLoaded } = useFollowList();
  const timeZone = deviceTimeZone();
  const onTheAir = useQuery({
    queryKey: ["onTheAir", "v1", timeZone],
    staleTime: DAY_MS,
    queryFn: () => tmdbClient.findOnTheAir(timeZone),
  });
  const page = useQuery({
    queryKey: ["airingThisWeekPage", LAUNCH],
    enabled: isLoaded && onTheAir.data !== undefined,
    staleTime: Infinity,
    queryFn: () =>
      fillTopPicks(
        airingThisWeek(onTheAir.data ?? []),
        0,
        ROW_SIZE,
        resolveTvMazeId,
        (tvmazeId) => followedIds.has(tvmazeId),
      ),
  });
  return page.data?.cards ?? [];
}

// The card's date: the next episode's day in the user's time zone, in the
// hero's words ("Today", "Tomorrow", "Fri"); nothing outside the week.
export function useNextEpisodeWord(tvmazeId: number): string | null {
  const todayDate = useToday();
  const { data: airstamp } = useQuery({
    queryKey: ["nextEpisodeAirstamp", "v1", tvmazeId],
    staleTime: DAY_MS / 4,
    queryFn: () => tvMazeClient.getNextEpisodeAirstamp(tvmazeId),
  });
  if (!airstamp) {
    return null;
  }
  return weekDayWord(
    localDateFromAirstamp(airstamp, deviceTimeZone()),
    todayDate,
  );
}
