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

export interface FilledPage {
  cards: TopPick[];
  // Where the next page starts in the ranking (wraps to 0).
  nextStart: number;
}

export async function fillTopPicks(
  ranking: RankedRecommendation[],
  start: number,
  size: number,
  // A title's TVmaze id, or null when TVmaze has none.
  resolveTvMazeId: (tmdbId: number) => Promise<number | null>,
  isFollowed: (tvmazeId: number) => boolean,
): Promise<FilledPage> {
  const cards: TopPick[] = [];
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
    if (tvmazeId !== null && !isFollowed(tvmazeId)) {
      cards.push({
        tmdbId: recommendation.id,
        tvmazeId,
        name: recommendation.name,
        posterPath: recommendation.poster_path,
      });
    }
  }
  return { cards, nextStart: total === 0 ? 0 : (start + examined) % total };
}
