// The status line in Show detail, on Shows rows and on followed Search rows
// (FR-028, FR-034, FR-035, PRD 5.5): one state derived from TVmaze's status,
// episodes and seasons. Dated facts win over the status.

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
  // The latest episode is out today and nothing is dated after it.
  | { kind: "airing-today" }
  // The airing season's next episode is listed without a date.
  | { kind: "airing-tba" }
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
  const regular = regularEpisodes(episodes);
  const dated = regular
    .filter((episode) => episode.airstamp)
    .map((episode) => ({
      season: episode.season,
      number: episode.number ?? 0,
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

  if (aired.at(-1)?.localDate === todayDate) {
    return { kind: "airing-today" };
  }

  if (show.status === "Ended") {
    return { kind: "ended" };
  }

  // An episode of the airing season after the last one out, not dated yet.
  const lastAiredNumber = Math.max(
    0,
    ...aired
      .filter(({ season }) => season === lastAiredSeason)
      .map(({ number }) => number),
  );
  const undatedNext = regular.some(
    (episode) =>
      !episode.airstamp &&
      episode.season === lastAiredSeason &&
      (episode.number ?? 0) > lastAiredNumber,
  );
  if (undatedNext) {
    return { kind: "airing-tba" };
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
    case "airing-today":
      return "Airing · new ep today";
    case "airing-tba":
      return "Airing · next ep TBA";
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
