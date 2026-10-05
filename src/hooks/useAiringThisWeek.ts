// "Airing this week" (FR-039, ADR 0016). TMDB discover gives the candidates
// for the region and the week in popularity order (kept a day); each must
// have a service in the region, the same rule as "Open in", and TVmaze
// decides: a show is kept only if it would be in the hero if followed, with
// its day on the card (CRI-110). The ten are shown by air date, Today
// first (CRI-122). A page is filled once and left alone, so following from
// the row keeps the card. Refresh fills the next page from where the last
// one stopped, without followed shows and without wrapping around; it is
// offered only while shows are left for the week (CRI-123). The page
// number is shared by every row on screen, so Refresh in Search also moves
// Home's row (FR-026), as for "Top picks for you".

import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { hasServiceInRegion } from "@/api/region-service";
import { tmdbClient } from "@/api/tmdb-client";
import { tvMazeClient } from "@/api/tvmaze-client";
import { resolveTvMazeId } from "@/api/tvmaze-id";
import {
  airingThisWeek,
  byAiringDate,
  firstEpisodeDayThisWeek,
  isAiringType,
  weekDayWord,
} from "@/logic/airing-this-week";
import { HOME_HERO_HORIZON_DAYS } from "@/logic/hero-carousel";
import { addDays, type LocalDate } from "@/logic/local-date";
import {
  fillTopPicks,
  type FilledPage,
  type PosterItem,
} from "@/logic/top-picks";
import { useFollowList } from "./useFollowList";
import { useRegion } from "./useRegion";
import { useToday } from "./useToday";
import { ROW_SIZE } from "./useTopPicks";

const DAY_MS = 24 * 60 * 60 * 1000;
// A show's type and nearby episodes, asked again after six hours.
const WEEK_INFO_STALE_MS = DAY_MS / 4;
const LAUNCH = Date.now();
const CANDIDATES_KEY = ["airingThisWeek", "v1"];
// Which page the rows show, in the query cache so Home and Search share it.
const PAGE_INDEX_KEY = ["airingThisWeekPageIndex", LAUNCH];

// The day word on the card ("Today", "Fri") and the date it orders by.
export type AiringPick = PosterItem & { day: string; date: LocalDate };

function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function useAiringThisWeek(): {
  cards: AiringPick[];
  // No page yet: the row keeps its space (CRI-110).
  isLoading: boolean;
  refresh: () => Promise<void>;
  isRefreshing: boolean;
  // Shows are left for the week after this page (CRI-123).
  canRefresh: boolean;
} {
  const queryClient = useQueryClient();
  const { followedIds, isLoaded } = useFollowList();
  const { region } = useRegion();
  const todayDate = useToday();
  const timeZone = deviceTimeZone();
  const week = {
    region: region ?? "",
    timeZone,
    from: todayDate,
    to: addDays(todayDate, HOME_HERO_HORIZON_DAYS - 1),
  };
  const candidates = useQuery({
    queryKey: [...CANDIDATES_KEY, region, todayDate, timeZone],
    enabled: region !== undefined,
    staleTime: DAY_MS,
    queryFn: () => tmdbClient.findAiringThisWeek(week),
  });
  const { data: pageIndex = 0 } = useQuery({
    queryKey: PAGE_INDEX_KEY,
    queryFn: () => 0,
    initialData: 0,
    staleTime: Infinity,
  });
  const pageKey = (index: number) => [
    "airingThisWeekPage",
    "v5",
    LAUNCH,
    region,
    todayDate,
    index,
  ];
  const page = useQuery({
    queryKey: pageKey(pageIndex),
    enabled: isLoaded && region !== undefined && candidates.data !== undefined,
    staleTime: Infinity,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<FilledPage<AiringPick>> => {
      const previous = queryClient.getQueryData<FilledPage<AiringPick>>(
        pageKey(pageIndex - 1),
      );
      const filled = await fillTopPicks(
        airingThisWeek(candidates.data ?? []),
        previous?.nextStart ?? 0,
        ROW_SIZE,
        resolveTvMazeId,
        (tvmazeId) => followedIds.has(tvmazeId),
        async (tvmazeId, tmdbId) => {
          if (!(await hasServiceInRegion(tvmazeId, tmdbId, region!))) {
            return null;
          }
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
          return word ? { day: word, date: day } : null;
        },
        { wrap: false },
      );
      // Every show left was left out: keep the row as it was, with nothing
      // more to refresh to.
      if (filled.cards.length === 0 && previous) {
        return { ...previous, nextStart: filled.nextStart, hasMore: false };
      }
      return { ...filled, cards: byAiringDate(filled.cards) };
    },
  });

  // The week's candidates are fetched again only when a day old, judged
  // now rather than at the last render; then the next page.
  async function refresh(): Promise<void> {
    await queryClient.refetchQueries({
      queryKey: CANDIDATES_KEY,
      predicate: (query) => query.isStaleByTime(DAY_MS),
    });
    queryClient.setQueryData<number>(PAGE_INDEX_KEY, (index = 0) => index + 1);
  }

  return {
    cards: page.data?.cards ?? [],
    isLoading: page.data === undefined && !page.isError,
    refresh,
    isRefreshing: page.isFetching,
    canRefresh: page.data?.hasMore ?? false,
  };
}
