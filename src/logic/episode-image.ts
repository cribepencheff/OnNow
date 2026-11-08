// Which image an episode card in Show detail's episode row draws (CRI-143,
// owner 2026-11-08), the first there is:
// 1. TMDB's still for the episode. TMDB often has one before TVmaze, whose
//    stills are added by its users days after an episode is out (100 Days
//    of Deception). TVmaze stays the source of the episode itself and its
//    day (ADR 0005, ADR 0006); the TMDB episode is matched by
//    matchTmdbEpisode, so never a wrong episode's still.
// 2. TVmaze's still, already in the show's data.
// 3. The show's TMDB backdrop: neutral, never another episode's still
//    (ADR 0012). Marked as the show's (showImage); the card dims only
//    upcoming episodes, whatever their image.
// 4. None: the card's empty frame (data first).

import { IMAGE_BASE, type TmdbSeasonEpisode } from "@/api/tmdb-types";
import type { TvMazeEpisode } from "@/api/tvmaze-types";
import { matchTmdbEpisode } from "./tmdb-episode";

export interface EpisodeImage {
  uri: string;
  // The show's backdrop standing in for the episode's own still.
  showImage: boolean;
}

// TMDB's stills are 16:9; "original" is sharp on a card on today's phones.
const STILL_SIZE = "original";
const BACKDROP_SIZE = "w780";

export function episodeImage(
  episode: TvMazeEpisode,
  tmdbEpisodes: TmdbSeasonEpisode[],
  backdropPath: string | null,
): EpisodeImage | null {
  const tmdb = matchTmdbEpisode(episode, tmdbEpisodes);
  if (tmdb?.stillPath) {
    return {
      uri: `${IMAGE_BASE}/${STILL_SIZE}${tmdb.stillPath}`,
      showImage: false,
    };
  }
  const tvmaze = episode.image?.original ?? episode.image?.medium;
  if (tvmaze) {
    return { uri: tvmaze, showImage: false };
  }
  return showBackdropImage(backdropPath);
}

// The show's backdrop as a card's image: for an episode with no still,
// and for an announced season's card (owner, 2026-11-08).
export function showBackdropImage(
  backdropPath: string | null,
): EpisodeImage | null {
  return backdropPath
    ? { uri: `${IMAGE_BASE}/${BACKDROP_SIZE}${backdropPath}`, showImage: true }
    : null;
}
