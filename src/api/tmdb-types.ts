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

// The largest backdrop size fetched (CRI-140, ADR 0012): w1920, which
// TMDB's image server serves but does not list in its documented sizes.
// The owner saw no difference from "original" on the phone, at a third of
// the file. If it fails, the same image at "original" (useFallbackUri).
export const LARGE_BACKDROP_SIZE = "w1920";
export const LARGE_BACKDROP_FALLBACK_SIZE = "original";
