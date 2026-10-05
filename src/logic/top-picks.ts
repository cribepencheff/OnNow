// Home's poster rows (FR-038, FR-039): walk a ranking in order from a start
// position, wrapping once, and check titles a few at a time until the row
// is full. Checking is the only network cost, so it stops as soon as it
// can; the TVmaze client's rate limit holds whatever the batch size.

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

// Titles checked at once: quicker than one by one, and at most two wasted
// checks when the row fills mid-batch.
export const CHECK_BATCH = 3;

export async function fillTopPicks<Extra = object>(
  ranking: RankedRecommendation[],
  start: number,
  size: number,
  // A title's TVmaze id, or null when TVmaze has none.
  resolveTvMazeId: (tmdbId: number) => Promise<number | null>,
  isFollowed: (tvmazeId: number) => boolean,
  // Optional further checks (a service in the region, airing this week),
  // which can reject a title (null) or add to its card.
  check?: (tvmazeId: number, tmdbId: number) => Promise<Extra | null>,
): Promise<FilledPage<Extra>> {
  const total = ranking.length;
  if (total === 0) {
    return { cards: [], nextStart: 0 };
  }
  // Every position once, in rank order from `start`, titles without a
  // poster left out (no request for them).
  const positions = Array.from(
    { length: total },
    (_, i) => (start + i) % total,
  ).filter((index) => ranking[index].recommendation.poster_path);

  async function evaluate(index: number): Promise<(TopPick & Extra) | null> {
    const { recommendation } = ranking[index];
    const tvmazeId = await resolveTvMazeId(recommendation.id);
    if (tvmazeId === null || isFollowed(tvmazeId)) {
      return null;
    }
    const extra = check
      ? await check(tvmazeId, recommendation.id)
      : ({} as Extra);
    return extra === null
      ? null
      : {
          tmdbId: recommendation.id,
          tvmazeId,
          name: recommendation.name,
          posterPath: recommendation.poster_path as string,
          ...extra,
        };
  }

  const cards: (TopPick & Extra)[] = [];
  let nextStart = (start + total) % total;
  for (
    let b = 0;
    b < positions.length && cards.length < size;
    b += CHECK_BATCH
  ) {
    const batch = positions.slice(b, b + CHECK_BATCH);
    const results = await Promise.all(batch.map(evaluate));
    for (let i = 0; i < batch.length; i += 1) {
      nextStart = (batch[i] + 1) % total;
      const card = results[i];
      if (card) {
        cards.push(card);
        if (cards.length === size) {
          break;
        }
      }
    }
  }
  return { cards, nextStart };
}
