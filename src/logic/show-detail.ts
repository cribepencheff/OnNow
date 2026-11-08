// Derived values for Show detail, PoC slice (PRD 5.5, FR-028, FR-032,
// FR-033, FR-034, FR-037, CRI-79). TVmaze data only, in its own terms
// (principle: data first). Views only render this (ADR 0009).

import { countryName } from "./regions";
import {
  daysBetween,
  localDateFromAirstamp,
  type LocalDate,
} from "./local-date";
import { formatLabelDate } from "./next-episode-label";
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

// "2026 · Philippines · Drama, Thriller" (FR-028): first year, the first
// origin country (TMDB), up to three genres (TVmaze). Missing parts drop.
export function showDetailMetaLine(
  show: TvMazeShow,
  originCountries: string[],
): string {
  const year = show.premiered ? show.premiered.slice(0, 4) : null;
  const country = originCountries[0] ? countryName(originCountries[0]) : null;
  const genres = (show.genres ?? []).slice(0, 3).join(", ");
  return [year, country, genres].filter(Boolean).join(" · ");
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

// "All episodes available" (CRI-81): every episode of the latest season
// TVmaze lists is out by today, and their number matches the season's
// episode order. A later season that is listed but not out yet, or a
// missing episode order, means false (data first).
export function allEpisodesAvailable(
  episodes: TvMazeEpisode[],
  seasons: TvMazeSeason[],
  timeZone: string,
  todayDate: LocalDate,
): boolean {
  if (seasons.length === 0) {
    return false;
  }
  const latestSeason = seasons.reduce((a, b) => (b.number > a.number ? b : a));
  if (latestSeason.episodeOrder === null) {
    return false;
  }
  const seasonEpisodes = regularEpisodes(episodes).filter(
    (episode) => episode.season === latestSeason.number,
  );
  return (
    seasonEpisodes.length === latestSeason.episodeOrder &&
    seasonEpisodes.every(
      (episode) => episodeState(episode, timeZone, todayDate) !== "upcoming",
    )
  );
}

// How long "New season" and "All episodes now available" stay in the hero's
// pill after the episode that earned them (owner, CRI-143).
const NEW_SEASON_DAYS = 7;
const ALL_EPISODES_DAYS = 30;

// The pill above Show detail's title (CRI-143), Apple TV style. The news
// comes first; the first that holds wins:
// - "New season": a later season's first episode came out within 7 days.
// - "All episodes now available": the latest season is complete
//   (allEpisodesAvailable) and its last episode came out within 30 days.
// - "New episode": an episode came out today or yesterday.
// Otherwise the show's status (showStateLabel: "Next ep Fri 13 Nov",
// "Season 3 · TBA", "Ended"), which the pill now carries in place of a
// line of its own (owner, 2026-11-08). A next episode's date that a news
// pill hides is still on its card in the episode row.
export function showDetailPill(
  episodes: TvMazeEpisode[],
  seasons: TvMazeSeason[],
  timeZone: string,
  todayDate: LocalDate,
  status: string,
): string {
  const out = regularEpisodes(episodes)
    .map((episode) => ({ episode, date: episodeLocalDate(episode, timeZone) }))
    .filter(
      (entry): entry is { episode: TvMazeEpisode; date: LocalDate } =>
        entry.date !== null && entry.date <= todayDate,
    );
  const daysAgo = (date: LocalDate) => daysBetween(date, todayDate);

  const premiere = out.find(
    (entry) =>
      entry.episode.season > 1 &&
      entry.episode.number === 1 &&
      daysAgo(entry.date) <= NEW_SEASON_DAYS,
  );
  if (premiere) {
    return "New season";
  }

  if (allEpisodesAvailable(episodes, seasons, timeZone, todayDate)) {
    const latestSeason = Math.max(...seasons.map((season) => season.number));
    const lastOut = out
      .filter((entry) => entry.episode.season === latestSeason)
      .reduce<LocalDate | null>(
        (latest, entry) =>
          !latest || entry.date > latest ? entry.date : latest,
        null,
      );
    if (lastOut && daysAgo(lastOut) <= ALL_EPISODES_DAYS) {
      return "All episodes now available";
    }
  }

  if (out.some((entry) => daysAgo(entry.date) <= 1)) {
    return "New episode";
  }

  return status;
}

// FR-032: the season the episode row opens on. An ended show opens on its
// first season, to start from the beginning (owner, 2026-11-08); any other
// on the current season.
export function initialSeasonNumber(
  episodes: TvMazeEpisode[],
  ended: boolean,
  timeZone: string,
  todayDate: LocalDate,
): number | null {
  if (ended) {
    const seasonsWithEpisodes = regularEpisodes(episodes).map(
      (episode) => episode.season,
    );
    return seasonsWithEpisodes.length > 0
      ? Math.min(...seasonsWithEpisodes)
      : null;
  }
  return currentSeasonNumber(episodes, timeZone, todayDate);
}

// The card the episode row opens on, as an index into the season's
// episodes: the latest one out by today, so the next one shows beside it
// (in place of the latest and next cards, owner, 2026-11-08). An ended
// show, and a season with nothing out yet, open on its first episode.
export function initialEpisodeIndex(
  seasonEpisodes: TvMazeEpisode[],
  ended: boolean,
  timeZone: string,
  todayDate: LocalDate,
): number {
  if (ended) {
    return 0;
  }
  let index = 0;
  seasonEpisodes.forEach((episode, i) => {
    if (episodeState(episode, timeZone, todayDate) !== "upcoming") {
      index = i;
    }
  });
  return index;
}

export interface AboutFact {
  label: string;
  value: string;
}

// The facts in Show detail's About sheet (PRD 5.5, owner 2026-11-08), from
// data the view already has: TVmaze's show, seasons and episodes, and
// TMDB's origin countries. A fact the data does not give is left out
// (data first). Seasons count only those with regular episodes listed, so
// an announced season is not one yet (FR-033); episodes count the regular
// ones TVmaze lists, upcoming included (FR-037).
export function aboutFacts(
  show: TvMazeShow & {
    _embedded: { episodes: TvMazeEpisode[]; seasons: TvMazeSeason[] };
  },
  originCountries: string[],
): AboutFact[] {
  const facts: AboutFact[] = [];
  const episodes = regularEpisodes(show._embedded.episodes);

  const first = show.premiered?.slice(0, 4);
  if (first) {
    const last = show.ended?.slice(0, 4);
    const value = !last
      ? `${first}–`
      : last === first
        ? first
        : `${first}–${last}`;
    facts.push({ label: "Years", value });
  }

  const seasonCount = new Set(episodes.map((episode) => episode.season)).size;
  if (seasonCount > 0) {
    facts.push({ label: "Seasons", value: String(seasonCount) });
    facts.push({ label: "Episodes", value: String(episodes.length) });
  }

  const runtime = show.averageRuntime ?? show.runtime;
  if (runtime) {
    facts.push({ label: "Runtime", value: `${runtime} min` });
  }

  const countries = originCountries
    .map(countryName)
    .filter((name): name is string => name !== null);
  if (countries.length > 0) {
    facts.push({ label: "Origin", value: countries.join(", ") });
  }

  if (show.language) {
    facts.push({ label: "Language", value: show.language });
  }

  return facts;
}
