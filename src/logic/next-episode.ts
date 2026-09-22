import { localDateFromAirstamp } from "./local-date";
import type {
  TvMazeEpisode,
  TvMazeSeason,
  TvMazeShow,
} from "@/api/tvmaze-types";

// What comes next for a show, in the terms TVmaze provides (principle:
// data first, FR-035). `status` is never used to decide whether more
// episodes are coming; only as a last-resort, verbatim fallback when
// nothing else is known (see docs/spikes/0001-tvmaze-data-quality.md,
// section 5, and ADR 0005).

export type NextForShow =
  | { kind: "episode"; episode: TvMazeEpisode }
  | { kind: "announced-season"; season: TvMazeSeason }
  | { kind: "status"; status: string };

export function nextForShow(
  show: TvMazeShow,
  episodes: TvMazeEpisode[],
  seasons: TvMazeSeason[],
  timeZone: string,
  todayDate: string,
): NextForShow {
  const upcomingEpisode = findEarliestUpcomingEpisode(
    episodes,
    timeZone,
    todayDate,
  );
  if (upcomingEpisode) {
    return { kind: "episode", episode: upcomingEpisode };
  }

  const announcedSeason = findEarliestAnnouncedSeason(seasons, todayDate);
  if (announcedSeason) {
    return { kind: "announced-season", season: announcedSeason };
  }

  return { kind: "status", status: show.status };
}

function findEarliestUpcomingEpisode(
  episodes: TvMazeEpisode[],
  timeZone: string,
  todayDate: string,
): TvMazeEpisode | null {
  const upcoming = episodes
    .map((episode) => ({
      episode,
      localDate: localDateFromAirstamp(episode.airstamp, timeZone),
    }))
    .filter(({ localDate }) => localDate >= todayDate)
    .sort((a, b) => a.localDate.localeCompare(b.localDate));

  return upcoming[0]?.episode ?? null;
}

function findEarliestAnnouncedSeason(
  seasons: TvMazeSeason[],
  todayDate: string,
): TvMazeSeason | null {
  const announced = seasons
    .filter((season) => season.premiereDate !== null)
    .filter((season) => season.premiereDate! >= todayDate)
    .sort((a, b) => a.premiereDate!.localeCompare(b.premiereDate!));

  if (announced.length > 0) {
    return announced[0];
  }

  // A season can be announced with an episode count but no date yet, or
  // with neither (spike 0001, section 4). Prefer one with a known episode
  // count when several unscheduled seasons exist.
  const unscheduled = seasons.filter((season) => season.premiereDate === null);
  const withEpisodeOrder = unscheduled.find(
    (season) => season.episodeOrder !== null,
  );

  return withEpisodeOrder ?? unscheduled[0] ?? null;
}
