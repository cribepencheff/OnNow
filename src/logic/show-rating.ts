// What a show's own TVmaze record says, with no request of its own: its
// rating (ADR 0018) and, for a Search row, its status (owner, 2026-10-22).
// Both are in every show TVmaze returns, search results included.

import type { TvMazeShow } from "@/api/tvmaze-types";

// TVmaze's users' average, with one decimal ("8.0"); null without one.
export function tvmazeRating(show: TvMazeShow): string | null {
  const average = show.rating?.average;
  return typeof average === "number" ? average.toFixed(1) : null;
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
