import { localDateFromAirstamp } from "./local-date";
import type { TvMazeEpisode, TvMazeShow } from "@/api/tvmaze-types";

// Specials are excluded by relying on the default TVmaze episode list
// (no `?specials=1`), which already omits them (ADR 0006, FR-037). This
// module does not need to filter on `type`.

export interface ShowEpisodesToday {
  show: TvMazeShow;
  episodes: TvMazeEpisode[];
}

export function findShowsWithEpisodeToday(
  followedShows: { show: TvMazeShow; episodes: TvMazeEpisode[] }[],
  timeZone: string,
  todayDate: string,
): ShowEpisodesToday[] {
  const results: ShowEpisodesToday[] = [];

  for (const { show, episodes } of followedShows) {
    const episodesToday = episodes.filter(
      (episode) =>
        localDateFromAirstamp(episode.airstamp, timeZone) === todayDate,
    );

    if (episodesToday.length > 0) {
      results.push({ show, episodes: episodesToday });
    }
  }

  return results;
}
