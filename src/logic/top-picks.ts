// "Top picks for you" cards (FR-038): walk the ranking in order from a start
// position, wrapping once, and resolve titles one at a time until the row is
// full. Resolution is the only network cost, so it stops as soon as it can.

import type { RankedRecommendation } from "./recommendations";

export interface TopPick {
  tmdbId: number;
  tvmazeId: number;
  name: string;
  posterPath: string;
}

export interface FilledPage<Extra = object> {
  cards: (TopPick & Extra)[];
  // Where the next page starts in the ranking (wraps to 0).
  nextStart: number;
}

export async function fillTopPicks<Extra = object>(
  ranking: RankedRecommendation[],
  start: number,
  size: number,
  // A title's TVmaze id, or null when TVmaze has none.
  resolveTvMazeId: (tmdbId: number) => Promise<number | null>,
  isFollowed: (tvmazeId: number) => boolean,
  // Optional: a further check on TVmaze, which can reject a title (null)
  // or add to its card (Airing this week, CRI-110).
  check?: (tvmazeId: number) => Promise<Extra | null>,
): Promise<FilledPage<Extra>> {
  const cards: (TopPick & Extra)[] = [];
  const total = ranking.length;
  let examined = 0;
  while (cards.length < size && examined < total) {
    const index = (start + examined) % total;
    examined += 1;
    const { recommendation } = ranking[index];
    if (!recommendation.poster_path) {
      continue;
    }
    const tvmazeId = await resolveTvMazeId(recommendation.id);
    if (tvmazeId === null || isFollowed(tvmazeId)) {
      continue;
    }
    const extra = check ? await check(tvmazeId) : ({} as Extra);
    if (extra !== null) {
      cards.push({
        tmdbId: recommendation.id,
        tvmazeId,
        name: recommendation.name,
        posterPath: recommendation.poster_path,
        ...extra,
      });
    }
  }
  return { cards, nextStart: total === 0 ? 0 : (start + examined) % total };
}
