// Derived values for Home (PRD 5.1, FR-004, FR-005, FR-006, FR-012). Views
// and hooks only render this; they do not decide it (ADR 0009).

import { formatLabelDate } from "./next-episode-label";
import type { ShowEpisodesToday } from "./episodes-today";
import type { NextForShow } from "./next-episode";
import type { LocalDate } from "./local-date";
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

export interface EarliestUpcoming {
  showId: number;
  episode: TvMazeEpisode;
}

// FR-006: the single nearest upcoming episode across all followed shows.
// Only an actual episode counts, not an announced season or a status; those
// belong to Show detail (MVP), not Home.
export function earliestUpcomingEpisode(
  nextByShow: { showId: number; next: NextForShow }[],
): EarliestUpcoming | null {
  const withEpisode = nextByShow.filter(
    (
      entry,
    ): entry is {
      showId: number;
      next: Extract<NextForShow, { kind: "episode" }>;
    } => entry.next.kind === "episode",
  );

  if (withEpisode.length === 0) {
    return null;
  }

  return withEpisode
    .map((entry) => ({ showId: entry.showId, episode: entry.next.episode }))
    .sort(
      (a, b) =>
        new Date(a.episode.airstamp).getTime() -
        new Date(b.episode.airstamp).getTime(),
    )[0];
}

// FR-006, ADR 0001: "TOMORROW" or a plain date, never a time of day.
export function upcomingDayLabel(
  localDate: LocalDate,
  todayDate: LocalDate,
): string {
  if (isNextDay(todayDate, localDate)) {
    return "TOMORROW";
  }
  return formatLabelDate(localDate);
}

function isNextDay(todayDate: LocalDate, localDate: LocalDate): boolean {
  return toUtcMillis(localDate) - toUtcMillis(todayDate) === 86_400_000;
}

function toUtcMillis(isoDate: LocalDate): number {
  const [year, month, day] = isoDate.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export type HomeViewState =
  | { kind: "loading" }
  | { kind: "empty-follow-list" }
  | { kind: "error" }
  | { kind: "today"; shows: ShowEpisodesToday[] }
  | { kind: "next-episode"; showId: number; episode: TvMazeEpisode }
  | { kind: "no-upcoming" };

// The priority a state is decided in: any data we already have (today, or a
// known next episode) is shown first, even if a background refetch is
// loading or has failed (NFR-001, NFR-002, data first). Only when there is
// truly nothing loaded yet do loading, the empty follow list and the
// no-data error states apply.
export function deriveHomeViewState(input: {
  followedCount: number;
  isLoading: boolean;
  isError: boolean;
  showsWithEpisodeToday: ShowEpisodesToday[];
  nextByShow: { showId: number; next: NextForShow }[];
}): HomeViewState {
  const {
    followedCount,
    isLoading,
    isError,
    showsWithEpisodeToday,
    nextByShow,
  } = input;

  if (showsWithEpisodeToday.length > 0) {
    return { kind: "today", shows: showsWithEpisodeToday };
  }

  const next = earliestUpcomingEpisode(nextByShow);
  if (next) {
    return {
      kind: "next-episode",
      showId: next.showId,
      episode: next.episode,
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
