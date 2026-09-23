// Derived values for Home (PRD 5.1, FR-004, FR-005, FR-006, FR-012). Views
// and hooks only render this; they do not decide it (ADR 0009).

import { isNextDay, localDateFromAirstamp, type LocalDate } from "./local-date";
import {
  findShowsWithEpisodeToday,
  type ShowEpisodesToday,
} from "./episodes-today";
import { formatLabelDate } from "./next-episode-label";
import { searchResultNetworkName } from "./search-results";
import type { TvMazeEpisode, TvMazeShow } from "@/api/tvmaze-types";

// "S1E5", or "S1" for the rare episode with no number yet.
export function episodeCode(episode: TvMazeEpisode): string {
  return episode.number !== null
    ? `S${episode.season}E${episode.number}`
    : `S${episode.season}`;
}

// FR-012, PRD 5.2 wording ("Episodes 1–8"): several episodes of one show on
// the same day collapse into one range instead of one code per episode.
export function episodesLabel(episodes: TvMazeEpisode[]): string {
  if (episodes.length <= 1) {
    return episodes[0] ? episodeCode(episodes[0]) : "";
  }

  const numbers = episodes
    .map((episode) => episode.number)
    .filter((number): number is number => number !== null)
    .sort((a, b) => a - b);

  if (numbers.length === 0) {
    return "";
  }

  return `Episodes ${numbers[0]}–${numbers[numbers.length - 1]}`;
}

// Metadata line on a Home card: episode code (or range) and network (PoC
// shows the network, not services in the user's territory).
export function homeCardMetaLine(
  show: TvMazeShow,
  episodes: TvMazeEpisode[],
): string {
  const code = episodesLabel(episodes);
  const network = searchResultNetworkName(show);
  return network ? `${code} · ${network}` : code;
}

// FR-005: "NEW TODAY · 1/3", pageIndex is 0-based.
export function todayCountLabel(pageIndex: number, total: number): string {
  return `NEW TODAY · ${pageIndex + 1}/${total}`;
}

export interface NextDayEpisodes {
  localDate: LocalDate;
  shows: ShowEpisodesToday[];
}

// FR-006: on a day without episodes, Home shows the episodes of the next
// day that has any, across all followed shows, one day only. Same grouping
// as today (FR-012): several episodes of one show that day are one card.
// Specials are already excluded upstream, by relying on the default TVmaze
// episode list (FR-037, see episodes-today.ts).
export function findNextDayWithEpisodes(
  followedShows: { show: TvMazeShow; episodes: TvMazeEpisode[] }[],
  timeZone: string,
  todayDate: LocalDate,
): NextDayEpisodes | null {
  const upcomingDates = followedShows
    .flatMap(({ episodes }) => episodes)
    .map((episode) => localDateFromAirstamp(episode.airstamp, timeZone))
    .filter((localDate) => localDate > todayDate)
    .sort();

  const nextDate = upcomingDates[0];
  if (!nextDate) {
    return null;
  }

  return {
    localDate: nextDate,
    shows: findShowsWithEpisodeToday(followedShows, timeZone, nextDate),
  };
}

// FR-006, ADR 0001: "TOMORROW" or a plain date, never a time of day. Upper
// case throughout, to match the "NEW TODAY" badge style, for example
// "THU 24 SEP".
export function upcomingDayLabel(
  localDate: LocalDate,
  todayDate: LocalDate,
): string {
  if (isNextDay(todayDate, localDate)) {
    return "TOMORROW";
  }
  return formatLabelDate(localDate).toUpperCase();
}

// FR-005-style badge for the next-day pager: "TOMORROW · 1/2" or
// "THU 24 SEP · 1/2", pageIndex is 0-based.
export function nextDayCountLabel(
  localDate: LocalDate,
  todayDate: LocalDate,
  pageIndex: number,
  total: number,
): string {
  return `${upcomingDayLabel(localDate, todayDate)} · ${pageIndex + 1}/${total}`;
}

export type HomeViewState =
  | { kind: "loading" }
  | { kind: "empty-follow-list" }
  | { kind: "error" }
  | { kind: "today"; shows: ShowEpisodesToday[] }
  | { kind: "next-day"; localDate: LocalDate; shows: ShowEpisodesToday[] }
  | { kind: "no-upcoming" };

// The priority a state is decided in: any data we already have (today, or
// the next day with episodes) is shown first, even if a background refetch
// is loading or has failed (NFR-001, NFR-002, data first). Only when there
// is truly nothing loaded yet do loading, the empty follow list and the
// no-data error states apply.
export function deriveHomeViewState(input: {
  followedCount: number;
  isLoading: boolean;
  isError: boolean;
  showsWithEpisodeToday: ShowEpisodesToday[];
  nextDayEpisodes: NextDayEpisodes | null;
}): HomeViewState {
  const {
    followedCount,
    isLoading,
    isError,
    showsWithEpisodeToday,
    nextDayEpisodes,
  } = input;

  if (showsWithEpisodeToday.length > 0) {
    return { kind: "today", shows: showsWithEpisodeToday };
  }

  if (nextDayEpisodes) {
    return {
      kind: "next-day",
      localDate: nextDayEpisodes.localDate,
      shows: nextDayEpisodes.shows,
    };
  }

  if (isError) {
    return { kind: "error" };
  }

  if (isLoading) {
    return { kind: "loading" };
  }

  if (followedCount === 0) {
    return { kind: "empty-follow-list" };
  }

  return { kind: "no-upcoming" };
}
