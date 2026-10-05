// "Airing this week" (FR-039, ADR 0016). TMDB's on-the-air list (kept a
// day) gives the candidates in popularity order; TVmaze decides: a show is
// kept only if it would be in the hero if followed, with its day on the
// card (CRI-110). A page is filled once per launch and left alone, so
// following from the row keeps the card.

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { tmdbClient } from "@/api/tmdb-client";
import { tvMazeClient } from "@/api/tvmaze-client";
import { resolveTvMazeId } from "@/api/tvmaze-id";
import {
  airingThisWeek,
  firstEpisodeDayThisWeek,
  isAiringType,
  weekDayWord,
} from "@/logic/airing-this-week";
import { fillTopPicks, type TopPick } from "@/logic/top-picks";
import { useFollowList } from "./useFollowList";
import { useToday } from "./useToday";
import { ROW_SIZE } from "./useTopPicks";

const DAY_MS = 24 * 60 * 60 * 1000;
// A show's type and nearby episodes, asked again after six hours.
const WEEK_INFO_STALE_MS = DAY_MS / 4;
const LAUNCH = Date.now();

export type AiringPick = TopPick & { day: string };

function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function useAiringThisWeek(): AiringPick[] {
  const queryClient = useQueryClient();
  const { followedIds, isLoaded } = useFollowList();
  const todayDate = useToday();
  const timeZone = deviceTimeZone();
  const onTheAir = useQuery({
    queryKey: ["onTheAir", "v1", timeZone],
    staleTime: DAY_MS,
    queryFn: () => tmdbClient.findOnTheAir(timeZone),
  });
  const page = useQuery({
    // v2: TVmaze decides membership and the day (CRI-110).
    queryKey: ["airingThisWeekPage", "v2", LAUNCH, todayDate],
    enabled: isLoaded && onTheAir.data !== undefined,
    staleTime: Infinity,
    queryFn: () =>
      fillTopPicks(
        airingThisWeek(onTheAir.data ?? []),
        0,
        ROW_SIZE,
        resolveTvMazeId,
        (tvmazeId) => followedIds.has(tvmazeId),
        async (tvmazeId) => {
          const info = await queryClient
            .fetchQuery({
              queryKey: ["tvmazeWeekInfo", "v1", tvmazeId],
              staleTime: WEEK_INFO_STALE_MS,
              queryFn: () => tvMazeClient.getWeekInfo(tvmazeId),
            })
            .catch(() => null);
          if (!info || !isAiringType(info.type)) {
            return null;
          }
          const day = firstEpisodeDayThisWeek(
            info.episodes,
            timeZone,
            todayDate,
          );
          const word = day && weekDayWord(day, todayDate);
          return word ? { day: word } : null;
        },
      ),
  });
  return page.data?.cards ?? [];
}
