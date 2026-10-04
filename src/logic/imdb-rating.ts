// The IMDb rating from an OMDb response (CRI-87, ADR 0013). OMDb writes
// "N/A" for missing values; that, or no rating at all, means no rating.

export interface OmdbTitleResponse {
  Response?: string;
  imdbRating?: string;
}

const RATING = /^\d+(\.\d+)?$/;

export function imdbRating(response: OmdbTitleResponse): string | null {
  if (response.Response !== "True") {
    return null;
  }
  const rating = response.imdbRating?.trim();
  return rating && RATING.test(rating) ? rating : null;
}

export function imdbTitleUrl(imdbId: string): string {
  return `https://www.imdb.com/title/${imdbId}/`;
}
