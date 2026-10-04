// A show's IMDb and TheTVDB IDs: TVmaze's, with TMDB's filling any gap
// (CRI-103). TVmaze's own IDs always win.

export interface ExternalIds {
  imdb: string | null;
  thetvdb: number | null;
}

// TMDB's /tv/{id}/external_ids, the parts this app reads, as returned.
export interface TmdbExternalIdsResponse {
  imdb_id?: string | null;
  tvdb_id?: number | null;
}

export function tmdbExternalIds(
  response: TmdbExternalIdsResponse,
): ExternalIds {
  return {
    imdb: response.imdb_id || null,
    thetvdb: response.tvdb_id || null,
  };
}

export function hasAllExternalIds(ids: ExternalIds): boolean {
  return ids.imdb !== null && ids.thetvdb !== null;
}

export function mergeExternalIds(
  tvmaze: ExternalIds,
  tmdb: ExternalIds | null,
): ExternalIds {
  return {
    imdb: tvmaze.imdb ?? tmdb?.imdb ?? null,
    thetvdb: tvmaze.thetvdb ?? tmdb?.thetvdb ?? null,
  };
}
