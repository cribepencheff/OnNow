// TMDB image API shapes and base URL, used by the hero's image sourcing
// (src/hooks/useShowImages.ts, src/logic/hero-images.ts).

export interface TmdbImage {
  file_path: string;
  iso_639_1: string | null;
  vote_average: number;
  vote_count: number;
  width: number;
  height: number;
}

export interface TmdbImages {
  backdrops?: TmdbImage[];
  logos?: TmdbImage[];
}

// A single episode's TMDB stills, the same TmdbImage shape as
// backdrops/logos above, just under its own "stills" key (TMDB's own
// /tv/{id}/season/{s}/episode/{e}/images endpoint response shape).
export interface TmdbEpisodeImages {
  stills?: TmdbImage[];
}

export const IMAGE_BASE = "https://image.tmdb.org/t/p";
