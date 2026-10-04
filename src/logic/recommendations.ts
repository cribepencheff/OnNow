// "Top picks for you" (FR-038, ADR 0016): TMDB's recommendations for each
// followed show, followed shows removed, ranked by how many followed shows
// recommend the same title. A count of TMDB's own data, nothing more.

export interface TmdbRecommendation {
  id: number;
  name: string;
  poster_path?: string | null;
  first_air_date?: string | null;
}

export interface RankedRecommendation {
  recommendation: TmdbRecommendation;
  // How many followed shows recommend it.
  count: number;
}

// Ties go to the title that sits highest in any one list (TMDB's own
// order), then the lower TMDB id, so the row is stable between renders.
export function rankRecommendations(
  lists: TmdbRecommendation[][],
  followedTmdbIds: ReadonlySet<number>,
  limit: number,
): RankedRecommendation[] {
  const byId = new Map<
    number,
    { recommendation: TmdbRecommendation; count: number; best: number }
  >();
  for (const list of lists) {
    const seenInList = new Set<number>();
    list.forEach((recommendation, position) => {
      if (
        followedTmdbIds.has(recommendation.id) ||
        seenInList.has(recommendation.id)
      ) {
        return;
      }
      seenInList.add(recommendation.id);
      const entry = byId.get(recommendation.id);
      if (entry) {
        entry.count += 1;
        entry.best = Math.min(entry.best, position);
      } else {
        byId.set(recommendation.id, {
          recommendation,
          count: 1,
          best: position,
        });
      }
    });
  }
  return [...byId.values()]
    .sort(
      (a, b) =>
        b.count - a.count ||
        a.best - b.best ||
        a.recommendation.id - b.recommendation.id,
    )
    .slice(0, limit)
    .map(({ recommendation, count }) => ({ recommendation, count }));
}
