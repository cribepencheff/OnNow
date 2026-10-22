// "Airing this week" (FR-039, ADR 0016). TMDB discover gives the candidates
// for the region, one day at a time, in popularity order (kept a day);
// each must have a service in the region, the same rule as "Open in", and
// TVmaze decides: a show is kept only if TVmaze has an episode on the day
// it is listed for, so it would be in the hero if followed, with its day
// on the card (CRI-110). The row goes day by day, today first, the most
// popular first within a day (airingByDay, owner 2026-10-22): what can be
// watched now leads, and loading more moves on to later days, so the
// cards are always in date order. A later day is asked for only when the
// row reaches it. A batch is filled once and left alone, so following
// from the row keeps the card. A drag past the row's end appends the next
// batch from where the last one stopped, without followed shows; at the
// end of the week's shows the row ends (CRI-131). The row never holds
// fewer cards than fit on the screen while the week has more (CRI-125).
// The batches, and the count shared with Search's row (FR-026), are
// usePosterBatches', as for "Top picks for you".

import { useQueryClient } from "@tanstack/react-query";

import { hasServiceInRegion } from "@/api/region-service";
import { tmdbClient } from "@/api/tmdb-client";
import { tvMazeClient } from "@/api/tvmaze-client";
import { resolveTvMazeId } from "@/api/tvmaze-id";
import {
  airingByDay,
  airsOn,
  isAiringType,
  weekDayWord,
  type TmdbOnTheAir,
} from "@/logic/airing-this-week";
import { HOME_HERO_HORIZON_DAYS } from "@/logic/hero-carousel";
import { addDays, type LocalDate } from "@/logic/local-date";
import { MIN_AIRING_CARDS } from "@/logic/poster-snap";
import {
  fillTopPicks,
  type FilledPage,
  type PosterItem,
} from "@/logic/top-picks";
import { useFollowList } from "./useFollowList";
import { usePosterBatches, type PosterBatches } from "./usePosterBatches";
import { useRegion } from "./useRegion";
import { useHiddenFollowed } from "./useSettledFollowed";
import { useToday } from "./useToday";

const DAY_MS = 24 * 60 * 60 * 1000;
// A show's type and nearby episodes, asked again after six hours.
const WEEK_INFO_STALE_MS = DAY_MS / 4;
const LAUNCH = Date.now();
// One day's candidates (v2: one day per request, not the week).
const CANDIDATES_KEY = ["airingThisWeek", "v2"];
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
  const hidden = useHiddenFollowed();
  const { region } = useRegion();
  const todayDate = useToday();
  const timeZone = deviceTimeZone();
  // The hero's window: today and the next six days.
  const weekDays = Array.from({ length: HOME_HERO_HORIZON_DAYS }, (_, i) =>
    addDays(todayDate, i),
  );
  const batches = usePosterBatches<AiringExtra>({
    pageKey: (index) => [
      "airingThisWeekPage",
      "v7",
      LAUNCH,
      region,
      todayDate,
      index,
    ],
    pageIndexKey: PAGE_INDEX_KEY,
    enabled: isLoaded && region !== undefined,
    fill: (start, size) => fillAiring(start, size),
    hidden,
    minCards: MIN_AIRING_CARDS,
  });

  // A day's candidates, fetched once a day and only when the row reaches
  // that day.
  async function candidatesOn(day: LocalDate): Promise<TmdbOnTheAir[]> {
    const results = await queryClient.fetchQuery({
      queryKey: [...CANDIDATES_KEY, region, day, timeZone],
      staleTime: DAY_MS,
      queryFn: () =>
        tmdbClient.findAiringOn({ region: region!, timeZone, day }),
    });
    return results ?? [];
  }

  // Walks the days in turn from where the last batch stopped: a day's
  // candidates are added to the ranking only once the days before it have
  // none left to check.
  async function fillAiring(
    start: number,
    size: number,
  ): Promise<FilledPage<AiringExtra>> {
    const days: { day: LocalDate; results: TmdbOnTheAir[] }[] = [];
    const cards: AiringPick[] = [];
    let nextStart = start;
    let followedSkipped = 0;
    for (const [i, day] of weekDays.entries()) {
      days.push({ day, results: await candidatesOn(day) });
      const { ranking, dayOf } = airingByDay(days);
      if (nextStart >= ranking.length) {
        continue;
      }
      const page = await fillTopPicks(
        ranking,
        nextStart,
        size - cards.length,
        resolveTvMazeId,
        (tvmazeId) => followedIds.has(tvmazeId),
        (tvmazeId, tmdbId) => checkOn(tvmazeId, tmdbId, dayOf.get(tmdbId)!),
      );
      cards.push(...page.cards);
      nextStart = page.nextStart;
      followedSkipped += page.followedSkipped;
      if (cards.length === size) {
        const laterDays = i < weekDays.length - 1;
        return {
          cards,
          nextStart,
          hasMore: page.hasMore || laterDays,
          followedSkipped,
        };
      }
    }
    return { cards, nextStart, hasMore: false, followedSkipped };
  }

  // A candidate is kept for the day it is listed for if it has a service
  // in the region and TVmaze has an episode of an airing type that day.
  async function checkOn(
    tvmazeId: number,
    tmdbId: number,
    day: LocalDate,
  ): Promise<AiringExtra | null> {
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
    if (!airsOn(info.episodes, timeZone, day)) {
      return null;
    }
    const word = weekDayWord(day, todayDate);
    return word ? { day: word, date: day } : null;
  }

  return batches;
}
