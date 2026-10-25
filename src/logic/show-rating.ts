// The show's rating, from TMDB's find answer the app already has (ADR
// 0019), and, for a Search row, its status from the search result alone
// (owner, 2026-10-22).

import type { TvMazeShow } from "@/api/tvmaze-types";
import type { TmdbFindResponse } from "./streaming-service";

// Fewer votes than this and the average says little (Special Forces: 17
// votes, 5.9 against IMDb's 7.2): no rating (ADR 0019).
export const TMDB_RATING_MIN_VOTES = 50;

// TMDB's users' average, with one decimal ("8.0"), and the show's TMDB
// page; null when TMDB does not
// know the show, has no average or too few votes. No fallback to another
// source, so the label always says whose it is.
export interface TmdbRating {
  value: string;
  // The show on TMDB, which the rating links to.
  url: string;
}

export function tmdbRating(find: TmdbFindResponse): TmdbRating | null {
  const result = find.tv_results?.[0];
  const average = result?.vote_average;
  const votes = result?.vote_count ?? 0;
  return result &&
    typeof average === "number" &&
    average > 0 &&
    votes >= TMDB_RATING_MIN_VOTES
    ? {
        value: average.toFixed(1),
        url: `https://www.themoviedb.org/tv/${result.id}`,
      }
    : null;
}

// A Search row's status, from the search result alone: "Airing" for a
// running show (when its next episode airs needs a request, so it is left
// to Show detail), "Ended · 2017" with its last year, and TVmaze's other
// statuses as Show detail words them.
export function searchStatusLabel(show: TvMazeShow): string {
  switch (show.status) {
    case "Running":
      return "Airing";
    case "Ended":
      return show.ended ? `Ended · ${show.ended.slice(0, 4)}` : "Ended";
    case "To Be Determined":
      return "Future uncertain";
    case "In Development":
      return "In development";
    default:
      return show.status;
  }
}
