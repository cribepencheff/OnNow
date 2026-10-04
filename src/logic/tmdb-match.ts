// Matching a TVmaze show to TMDB by name, only when TVmaze has no IMDb or
// TheTVDB ID (CRI-99). Data first: a match must be certain, never a guess.

import { addDays, type LocalDate } from "./local-date";

export interface TmdbSearchResult {
  id: number;
  name: string;
  original_name?: string;
  first_air_date?: string;
  origin_country?: string[];
}

// "JAŸ-Z IN 8" and "Jay-Z in 8" both become "jayzin8".
export function normalizeTitle(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function sameName(result: TmdbSearchResult, name: string): boolean {
  const wanted = normalizeTitle(name);
  return [result.name, result.original_name].some(
    (candidate) =>
      candidate !== undefined && normalizeTitle(candidate) === wanted,
  );
}

// The same first air date as TVmaze's premiere; among several, the one with
// the same name. One day off (time zones) only for a single result with
// the same name.
export function matchTmdbSearch(
  results: TmdbSearchResult[],
  name: string,
  premiered: LocalDate | null,
): TmdbSearchResult | null {
  if (!premiered) {
    return null;
  }
  const sameDate = results.filter(
    (result) => result.first_air_date === premiered,
  );
  if (sameDate.length === 1) {
    return sameDate[0];
  }
  if (sameDate.length > 1) {
    const named = sameDate.filter((result) => sameName(result, name));
    return named.length === 1 ? named[0] : null;
  }
  const [only] = results;
  const nextToPremiere = [addDays(premiered, -1), addDays(premiered, 1)];
  return results.length === 1 &&
    only.first_air_date !== undefined &&
    nextToPremiere.includes(only.first_air_date) &&
    sameName(only, name)
    ? only
    : null;
}
