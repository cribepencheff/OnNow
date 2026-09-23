// Derived values for Show detail, PoC slice (PRD 5.5, FR-028, FR-032,
// FR-033, FR-034, FR-037, CRI-79). TVmaze data only, in its own terms
// (principle: data first). Views only render this (ADR 0009).

import {
  addDays,
  daysBetween,
  localDateFromAirstamp,
  type LocalDate,
} from "./local-date";
import { nextForShow } from "./next-episode";
import { formatLabelDate, nextDateLabel } from "./next-episode-label";
import {
  searchResultMetaLine,
  searchResultNetworkName,
} from "./search-results";
import type {
  TvMazeEpisode,
  TvMazeSeason,
  TvMazeShow,
} from "@/api/tvmaze-types";

// Relative days are used within a week either way; further away a date
// reads better than "In 289 days" (PRD 5.5 examples: "In 3 days",
// "Tomorrow", "2 days ago").
const RELATIVE_DAYS_LIMIT = 7;

export function relativeDayLabel(
  localDate: LocalDate,
  todayDate: LocalDate,
): string {
  const days = daysBetween(todayDate, localDate);
  if (days === 0) {
    return "Today";
  }
  if (days === 1) {
    return "Tomorrow";
  }
  if (days === -1) {
    return "Yesterday";
  }
  if (days > 1 && days <= RELATIVE_DAYS_LIMIT) {
    return `In ${days} days`;
  }
  if (days < -1 && days >= -RELATIVE_DAYS_LIMIT) {
    return `${-days} days ago`;
  }
  return formatLabelDate(localDate, todayDate);
}

// "2022 · Running · Apple TV": year, status and network (FR-028; the PoC
// shows the network, services are MVP).
export function showDetailMetaLine(show: TvMazeShow): string {
  const network = searchResultNetworkName(show);
  const meta = searchResultMetaLine(show);
  return network ? `${meta} · ${network}` : meta;
}

// FR-037: specials are never shown.
export function regularEpisodes(episodes: TvMazeEpisode[]): TvMazeEpisode[] {
  return episodes.filter((episode) => episode.type === "regular");
}

// An episode's local day, or null when TVmaze has no airstamp yet ("TBA").
function episodeLocalDate(
  episode: TvMazeEpisode,
  timeZone: string,
): LocalDate | null {
  return episode.airstamp
    ? localDateFromAirstamp(episode.airstamp, timeZone)
    : null;
}

// The most recent episode out by today, including one out today.
export function latestEpisode(
  episodes: TvMazeEpisode[],
  timeZone: string,
  todayDate: LocalDate,
): TvMazeEpisode | null {
  let latest: { episode: TvMazeEpisode; localDate: LocalDate } | null = null;
  for (const episode of regularEpisodes(episodes)) {
    const localDate = episodeLocalDate(episode, timeZone);
    if (localDate && localDate <= todayDate) {
      if (!latest || localDate >= latest.localDate) {
        latest = { episode, localDate };
      }
    }
  }
  return latest?.episode ?? null;
}

export type NextCard =
  | { kind: "episode"; episode: TvMazeEpisode }
  | { kind: "season-premiere"; label: string }
  | { kind: "status"; status: string };

// FR-034: what comes after today. A regular episode gets an episode card.
// Between seasons it is a season card: episode 1 of a season, or an
// announced season's premiere date, labelled as a premiere (CRI-78);
// otherwise the show's status as TVmaze states it. Today's episode is the
// latest card, not the next one.
export function nextCard(
  show: TvMazeShow,
  episodes: TvMazeEpisode[],
  seasons: TvMazeSeason[],
  timeZone: string,
  todayDate: LocalDate,
): NextCard {
  const next = nextForShow(
    show,
    regularEpisodes(episodes),
    seasons,
    timeZone,
    addDays(todayDate, 1),
  );

  if (next.kind === "episode") {
    if (next.episode.number === 1) {
      return {
        kind: "season-premiere",
        label: nextDateLabel(
          localDateFromAirstamp(next.episode.airstamp, timeZone),
          todayDate,
          next.episode.season,
        ),
      };
    }
    return { kind: "episode", episode: next.episode };
  }

  if (next.kind === "announced-season" && next.season.premiereDate) {
    return {
      kind: "season-premiere",
      label: nextDateLabel(
        next.season.premiereDate,
        todayDate,
        next.season.number,
      ),
    };
  }

  return { kind: "status", status: show.status };
}

function seasonOf(
  episode: TvMazeEpisode,
  seasons: TvMazeSeason[],
): TvMazeSeason | undefined {
  return seasons.find((season) => season.number === episode.season);
}

// "Episode 2 of 10" (PRD 5.5), or "Episode 2" when TVmaze has no episode
// order for the season.
export function episodeOfLabel(
  episode: TvMazeEpisode,
  seasons: TvMazeSeason[],
): string {
  const order = seasonOf(episode, seasons)?.episodeOrder ?? null;
  return order !== null
    ? `Episode ${episode.number} of ${order}`
    : `Episode ${episode.number}`;
}

export type EpisodeState = "aired" | "today" | "upcoming";

export function episodeState(
  episode: TvMazeEpisode,
  timeZone: string,
  todayDate: LocalDate,
): EpisodeState {
  const localDate = episodeLocalDate(episode, timeZone);
  if (!localDate || localDate > todayDate) {
    return "upcoming";
  }
  return localDate === todayDate ? "today" : "aired";
}

// Relative day, or "TBA" when TVmaze has no date yet. Never a time of day
// (ADR 0001).
export function episodeDateLabel(
  episode: TvMazeEpisode,
  timeZone: string,
  todayDate: LocalDate,
): string {
  const localDate = episodeLocalDate(episode, timeZone);
  return localDate ? relativeDayLabel(localDate, todayDate) : "TBA";
}

// The last episode of a season, known only when TVmaze gives the season's
// episode order (data first: never guessed from the last listed episode).
export function isFinale(
  episode: TvMazeEpisode,
  seasons: TvMazeSeason[],
): boolean {
  const order = seasonOf(episode, seasons)?.episodeOrder ?? null;
  return order !== null && episode.number === order;
}

export interface SeasonTab {
  number: number;
  // A season TVmaze has announced but has no episodes for yet (FR-033).
  announced: boolean;
  // The announced season's premiere date, or "Announced" without one.
  note: string | null;
}

// FR-032, FR-033: one tab per season with regular episodes, then announced
// seasons still to come. A season without episodes whose premiere date has
// passed has nothing to show, so it gets no tab.
export function seasonTabs(
  seasons: TvMazeSeason[],
  episodes: TvMazeEpisode[],
  todayDate: LocalDate,
): SeasonTab[] {
  const withEpisodes = new Set(
    regularEpisodes(episodes).map((episode) => episode.season),
  );

  return [...seasons]
    .sort((a, b) => a.number - b.number)
    .flatMap((season): SeasonTab[] => {
      if (withEpisodes.has(season.number)) {
        return [{ number: season.number, announced: false, note: null }];
      }
      if (season.premiereDate === null) {
        return [{ number: season.number, announced: true, note: "Announced" }];
      }
      if (season.premiereDate >= todayDate) {
        return [
          {
            number: season.number,
            announced: true,
            note: formatLabelDate(season.premiereDate, todayDate),
          },
        ];
      }
      return [];
    });
}

// FR-032: the current season is the one of the latest episode out by
// today; before a show's first episode, its first season with episodes.
export function currentSeasonNumber(
  episodes: TvMazeEpisode[],
  timeZone: string,
  todayDate: LocalDate,
): number | null {
  const latest = latestEpisode(episodes, timeZone, todayDate);
  if (latest) {
    return latest.season;
  }
  const seasonsWithEpisodes = regularEpisodes(episodes).map(
    (episode) => episode.season,
  );
  return seasonsWithEpisodes.length > 0
    ? Math.min(...seasonsWithEpisodes)
    : null;
}
