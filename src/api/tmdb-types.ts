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

// An episode in TMDB's season details (/tv/{id}/season/{n}), trimmed to
// what the episode row uses (CRI-143): its still and its overview.
export interface TmdbSeasonEpisode {
  episodeNumber: number;
  // TMDB's date, without a time of day (ADR 0005), or null.
  airDate: string | null;
  stillPath: string | null;
  // In English; null where TMDB has none (it sends "").
  overview: string | null;
}

export interface TmdbSeasonResponse {
  episodes?: {
    episode_number: number;
    air_date: string | null;
    still_path: string | null;
    overview?: string | null;
  }[];
  videos?: TmdbVideosResponse;
}

// TMDB's videos for a show or a season (/videos, or appended), as TMDB
// sends them (ADR 0021).
export interface TmdbVideosResponse {
  results?: {
    key?: string | null;
    name?: string | null;
    site?: string | null;
    type?: string | null;
    official?: boolean | null;
    iso_639_1?: string | null;
    published_at?: string | null;
  }[];
}

// A video TMDB lists, trimmed (ADR 0021). key is the video's id on its
// site (YouTube's "v=").
export interface TmdbVideo {
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
  language: string | null;
  // "2026-08-18T16:00:12.000Z", or null.
  publishedAt: string | null;
}

// A season's episodes and videos from TMDB (CRI-143, ADR 0021).
export interface TmdbSeason {
  episodes: TmdbSeasonEpisode[];
  videos: TmdbVideo[];
}

// Someone TMDB lists as having created a show (CRI-143), with a portrait
// path where it has one.
export interface TmdbCreator {
  name: string;
  profilePath: string | null;
}

// A cast member in TMDB's credits for a show (CRI-143): the current main
// cast, in TMDB's order.
export interface TmdbCastMember {
  name: string;
  character: string | null;
  profilePath: string | null;
}

// A crew member in TMDB's credits for a show (CRI-143), kept only for the
// jobs Show detail's Cast & Crew row shows (KEY_CREW_JOBS).
export interface TmdbCrewMember {
  name: string;
  job: string;
  profilePath: string | null;
}

export const IMAGE_BASE = "https://image.tmdb.org/t/p";

// The largest backdrop size fetched (CRI-140, ADR 0012): w1920, which
// TMDB's image server serves but does not list in its documented sizes.
// The owner saw no difference from "original" on the phone, at a third of
// the file. If it fails, the same image at "original" (useFallbackUri).
export const LARGE_BACKDROP_SIZE = "w1920";
export const LARGE_BACKDROP_FALLBACK_SIZE = "original";
