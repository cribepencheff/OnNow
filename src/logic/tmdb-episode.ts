// The TMDB episode that is the same as a TVmaze episode (CRI-143), for its
// still (episode-image.ts) and its overview (episodeSummary). TVmaze stays
// the source of the episodes and their days (ADR 0005, ADR 0006). The two
// can number a season differently, so a TMDB episode counts only when its
// number matches and its date is within a day of TVmaze's (TMDB and
// TVmaze can date it a day apart): never a wrong episode's still or text.

import type { TmdbSeasonEpisode } from "@/api/tmdb-types";
import type { TvMazeEpisode } from "@/api/tvmaze-types";
import { daysBetween } from "./local-date";
import { plainTextSummary } from "./search-results";

export function matchTmdbEpisode(
  episode: TvMazeEpisode,
  tmdbEpisodes: TmdbSeasonEpisode[],
): TmdbSeasonEpisode | null {
  if (episode.number === null || episode.airdate === "") {
    return null;
  }
  return (
    tmdbEpisodes.find(
      (candidate) =>
        candidate.episodeNumber === episode.number &&
        candidate.airDate !== null &&
        Math.abs(daysBetween(candidate.airDate, episode.airdate)) <= 1,
    ) ?? null
  );
}

// An episode card's short summary (owner, 2026-11-08): TVmaze's, else
// TMDB's overview for the same episode. Null without either; the card
// then says "No overview available." (owner, 2026-11-08).
export function episodeSummary(
  episode: TvMazeEpisode,
  tmdbEpisodes: TmdbSeasonEpisode[],
): string | null {
  return (
    plainTextSummary(episode.summary) ??
    matchTmdbEpisode(episode, tmdbEpisodes)?.overview ??
    null
  );
}
