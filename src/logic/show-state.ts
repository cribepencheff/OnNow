// The status line in Show detail (FR-028, FR-034): one state derived from
// TVmaze's status, episodes and seasons. Dated facts win over the status.

import { localDateFromAirstamp, type LocalDate } from "./local-date";
import { formatLabelDate } from "./next-episode-label";
import { regularEpisodes } from "./show-detail";
import { statusLabel } from "./show-status";
import type {
  TvMazeEpisode,
  TvMazeSeason,
  TvMazeShow,
} from "@/api/tvmaze-types";

export type ShowState =
  | { kind: "airing"; nextDate: LocalDate }
  | { kind: "season-dated"; season: number; date: LocalDate }
  | { kind: "season-tba"; season: number }
  | { kind: "between-seasons" }
  | { kind: "future-uncertain" }
  | { kind: "ended" }
  | { kind: "other"; status: string };

export function showState(
  show: Pick<TvMazeShow, "status">,
  episodes: TvMazeEpisode[],
  seasons: TvMazeSeason[],
  timeZone: string,
  todayDate: LocalDate,
): ShowState {
  const dated = regularEpisodes(episodes)
    .filter((episode) => episode.airstamp)
    .map((episode) => ({
      season: episode.season,
      localDate: localDateFromAirstamp(episode.airstamp, timeZone),
    }))
    .sort((a, b) => a.localDate.localeCompare(b.localDate));

  const aired = dated.filter(({ localDate }) => localDate <= todayDate);
  const lastAiredSeason = aired.at(-1)?.season ?? null;
  const next = dated.find(({ localDate }) => localDate > todayDate);

  if (next) {
    return next.season === lastAiredSeason
      ? { kind: "airing", nextDate: next.localDate }
      : { kind: "season-dated", season: next.season, date: next.localDate };
  }

  // A season listed after every season that has aired episodes.
  const newSeasons = seasons
    .filter((season) => season.number > (lastAiredSeason ?? 0))
    .sort((a, b) => a.number - b.number);

  const datedSeason = newSeasons.find(
    (season) => season.premiereDate !== null && season.premiereDate > todayDate,
  );
  if (datedSeason) {
    return {
      kind: "season-dated",
      season: datedSeason.number,
      date: datedSeason.premiereDate!,
    };
  }

  if (show.status === "Ended") {
    return { kind: "ended" };
  }

  const undatedSeason = newSeasons.find(
    (season) => season.premiereDate === null,
  );
  if (undatedSeason) {
    return { kind: "season-tba", season: undatedSeason.number };
  }

  switch (show.status) {
    case "To Be Determined":
      return { kind: "future-uncertain" };
    case "Running":
      // Running with nothing listed: no renewal is implied.
      return { kind: "between-seasons" };
    default:
      return { kind: "other", status: statusLabel(show.status) };
  }
}

export function showStateLabel(state: ShowState, todayDate: LocalDate): string {
  switch (state.kind) {
    case "airing":
      return `Airing · next ep ${formatLabelDate(state.nextDate, todayDate)}`;
    case "season-dated":
      return `Season ${state.season} · ${formatLabelDate(state.date, todayDate)}`;
    case "season-tba":
      return `Season ${state.season} · TBA`;
    case "between-seasons":
      return "Between seasons";
    case "future-uncertain":
      return "Future uncertain";
    case "ended":
      return "Ended";
    case "other":
      return state.status;
  }
}
