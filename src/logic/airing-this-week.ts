// "Airing this week" (FR-039, ADR 0016): TMDB discover (the region, the
// week) is the candidate source, in its popularity order; TVmaze decides. A show is in
// the row only if it would be in the hero if followed (CRI-110).

import { addDays, localDateFromAirstamp, type LocalDate } from "./local-date";
import { WEEKDAYS } from "./next-episode-label";
import type { RankedRecommendation } from "./recommendations";

export interface TmdbOnTheAir {
  id: number;
  name: string;
  poster_path?: string | null;
  popularity?: number;
  genre_ids?: number[];
}

// TMDB genres that are never kept (talk, news, reality, soap): left out
// before any TVmaze request, also when discover already left them out.
// TMDB has no game show or sports genre; TVmaze's type decides those
// (isAiringType).
const NEVER_KEPT_GENRES = new Set([10767, 10763, 10764, 10766]);

// Candidates in TMDB's popularity order, each once, as a ranking that
// fillTopPicks can walk.
export function airingThisWeek(
  results: TmdbOnTheAir[],
): RankedRecommendation[] {
  const seen = new Set<number>();
  return results
    .filter(
      (show) => !(show.genre_ids ?? []).some((id) => NEVER_KEPT_GENRES.has(id)),
    )
    .filter((show) => !seen.has(show.id) && seen.add(show.id))
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
    .map((show) => ({
      recommendation: {
        id: show.id,
        name: show.name,
        poster_path: show.poster_path ?? null,
      },
      count: 1,
    }));
}

// The row's order (CRI-122, owner 2026-10-22): day by day, today first,
// the most popular first within a day, so the row leads with what can be
// watched now and loading more moves on to later days. Each day's
// candidates come from their own discover request, added only when the
// row needs that day; a show listed on several days is kept on its first.
// Adding a day appends to the ranking, so no earlier place moves. dayOf is
// the day each show is listed for.
export function airingByDay(
  days: { day: LocalDate; results: TmdbOnTheAir[] }[],
): { ranking: RankedRecommendation[]; dayOf: Map<number, LocalDate> } {
  const dayOf = new Map<number, LocalDate>();
  const ranking: RankedRecommendation[] = [];
  for (const { day, results } of days) {
    for (const entry of airingThisWeek(results)) {
      if (!dayOf.has(entry.recommendation.id)) {
        dayOf.set(entry.recommendation.id, day);
        ranking.push(entry);
      }
    }
  }
  return { ranking, dayOf };
}

// The hero's day words: "Today", "Tomorrow", then the weekday ("Fri");
// null outside the 7-day window.
export function weekDayWord(
  localDate: LocalDate,
  todayDate: LocalDate,
): string | null {
  if (localDate === todayDate) {
    return "Today";
  }
  if (localDate === addDays(todayDate, 1)) {
    return "Tomorrow";
  }
  if (localDate < todayDate || localDate > addDays(todayDate, 6)) {
    return null;
  }
  const [year, month, day] = localDate.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

// TVmaze show types kept: scripted shows (animation included) and
// documentaries. Reality, talk, news, game shows, sports, variety, award
// and panel shows are not.
const KEPT_TYPES = new Set(["Scripted", "Animation", "Documentary"]);

export function isAiringType(tvmazeType: string | null | undefined): boolean {
  return Boolean(tvmazeType && KEPT_TYPES.has(tvmazeType));
}

export interface WeekEpisode {
  airstamp: string | null;
  // null for a special, which the hero never shows (FR-037).
  number: number | null;
}

// Whether TVmaze has a regular episode on a day, in the user's time zone:
// a show is on that day's part of the row only then, as the hero would
// show it if followed (CRI-110). TVmaze decides when it and TMDB's listing
// disagree; the show is then left out of that day.
export function airsOn(
  episodes: WeekEpisode[],
  timeZone: string,
  day: LocalDate,
): boolean {
  return episodes.some(
    (episode) =>
      episode.number !== null &&
      episode.airstamp !== null &&
      localDateFromAirstamp(episode.airstamp, timeZone) === day,
  );
}
