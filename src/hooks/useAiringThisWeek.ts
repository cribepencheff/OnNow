// "Airing this week" (FR-039, ADR 0016). TMDB discover gives the candidates
// for the region and the week in popularity order (kept a day); each must
// have a service in the region, the same rule as "Open in", and TVmaze
// decides: a show is kept only if it would be in the hero if followed, with
// its day on the card (CRI-110). The ten are shown by air date, Today
// first (CRI-122) within each batch. A batch is filled once and left
// alone, so following from the row keeps the card. Swiping towards the
// row's end appends the next batch from where the last one stopped,
// without followed shows; at the end of the week's shows the row ends
// (CRI-131). The batches, the next one prepared ahead, and the count shared
// with Search's row (FR-026) are usePosterBatches', as for "Top picks for
// you".

import { useQuery, useQueryClient } from "@tanstack/react-query";

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
import { fillTopPicks, type PosterItem } from "@/logic/top-picks";
import { useFollowList } from "./useFollowList";
import { usePosterBatches, type PosterBatches } from "./usePosterBatches";
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
type AiringExtra = { day: string; date: LocalDate };
export type AiringPick = PosterItem & AiringExtra;

function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function useAiringThisWeek(): PosterBatches<AiringExtra> {
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
  const batches = usePosterBatches<AiringExtra>({
    pageKey: (index) => [
      "airingThisWeekPage",
      "v6",
      LAUNCH,
      region,
      todayDate,
      index,
    ],
    pageIndexKey: PAGE_INDEX_KEY,
    enabled: isLoaded && region !== undefined && candidates.data !== undefined,
    fill: (start) => fillAiring(start),
    isFollowed: (tvmazeId) => followedIds.has(tvmazeId),
  });

  async function fillAiring(start: number) {
    const filled = await fillWeek(start);
    return { ...filled, cards: byAiringDate(filled.cards) };
  }

  function fillWeek(start: number) {
    return fillTopPicks(
      airingThisWeek(candidates.data ?? []),
      start,
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
        const day = firstEpisodeDayThisWeek(info.episodes, timeZone, todayDate);
        const word = day && weekDayWord(day, todayDate);
        return word ? { day: word, date: day } : null;
      },
    );
  }

  return batches;
}
