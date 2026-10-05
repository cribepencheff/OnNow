// "Airing this week" (FR-039, ADR 0016): TMDB's on-the-air list is the
// candidate source, in its popularity order; TVmaze decides. A show is in
// the row only if it would be in the hero if followed (CRI-110).

import { HOME_HERO_HORIZON_DAYS } from "./hero-carousel";
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

// TMDB genres that are never kept (talk, news, reality): left out before
// any TVmaze request. TMDB has no game show or sports genre; TVmaze's
// type decides those (isAiringType).
const NEVER_KEPT_GENRES = new Set([10767, 10763, 10764]);

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

// The first day this week with a regular episode, in the user's time zone,
// over the same window as the hero (today and the next 6 days); null when
// none, so the show would not be in the hero if followed.
export function firstEpisodeDayThisWeek(
  episodes: WeekEpisode[],
  timeZone: string,
  todayDate: LocalDate,
): LocalDate | null {
  const horizonEnd = addDays(todayDate, HOME_HERO_HORIZON_DAYS - 1);
  const days = episodes
    .filter((episode) => episode.number !== null && episode.airstamp)
    .map((episode) =>
      localDateFromAirstamp(episode.airstamp as string, timeZone),
    )
    .filter((day) => day >= todayDate && day <= horizonEnd)
    .sort();
  return days[0] ?? null;
}
