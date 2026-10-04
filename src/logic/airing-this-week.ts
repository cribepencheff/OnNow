// "Airing this week" (FR-039, ADR 0016): TMDB's on-the-air list (an episode
// within the next 7 days), scripted shows only, by TMDB's popularity.

import { addDays, type LocalDate } from "./local-date";
import { WEEKDAYS } from "./next-episode-label";
import type { RankedRecommendation } from "./recommendations";

export interface TmdbOnTheAir {
  id: number;
  name: string;
  poster_path?: string | null;
  popularity?: number;
  genre_ids?: number[];
}

// Not scripted: talk, news, reality, soap (owner's list) and documentary.
const NOT_SCRIPTED = new Set([10767, 10763, 10764, 10766, 99]);

// Scripted shows in TMDB's popularity order, each once, as a ranking that
// fillTopPicks can walk.
export function airingThisWeek(
  results: TmdbOnTheAir[],
): RankedRecommendation[] {
  const seen = new Set<number>();
  return results
    .filter(
      (show) => !(show.genre_ids ?? []).some((id) => NOT_SCRIPTED.has(id)),
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
