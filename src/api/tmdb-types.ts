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

export const IMAGE_BASE = "https://image.tmdb.org/t/p";
