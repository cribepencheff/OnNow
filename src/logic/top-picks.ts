// The poster rows on Home and in Search (FR-038, FR-039, FR-026): walk a ranking in order from a start
// position to the end, never wrapping (CRI-123: at the end the row offers
// "Start over"), and check titles a few at a time until the row is full. Checking is the only network cost, so it stops as soon as it
// can; the TVmaze client's rate limit holds whatever the batch size.

import type { RankedRecommendation } from "./recommendations";

export interface PosterItem {
  tmdbId: number;
  tvmazeId: number;
  name: string;
  posterPath: string;
}

export interface FilledPage<Extra = object> {
  cards: (PosterItem & Extra)[];
  // Where the next page starts in the ranking.
  nextStart: number;
  // Whether a next page has any titles left to look at (CRI-123).
  hasMore: boolean;
  // Followed titles passed over, so an empty page can tell "all followed"
  // from "nothing at all" (CRI-123).
  followedSkipped: number;
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
  // Every position once, in rank order from `start` to the end, titles
  // without a poster left out (no request for them).
  const positions = Array.from(
    { length: Math.max(total - start, 0) },
    (_, i) => start + i,
  ).filter((index) => ranking[index].recommendation.poster_path);
  let followedSkipped = 0;

  async function evaluate(index: number): Promise<(PosterItem & Extra) | null> {
    const { recommendation } = ranking[index];
    const tvmazeId = await resolveTvMazeId(recommendation.id);
    if (tvmazeId === null) {
      return null;
    }
    if (isFollowed(tvmazeId)) {
      followedSkipped += 1;
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

  const cards: (PosterItem & Extra)[] = [];
  let nextStart = Math.min(start, total);
  for (
    let b = 0;
    b < positions.length && cards.length < size;
    b += CHECK_BATCH
  ) {
    const batch = positions.slice(b, b + CHECK_BATCH);
    const results = await Promise.all(batch.map(evaluate));
    for (let i = 0; i < batch.length; i += 1) {
      nextStart = batch[i] + 1;
      const card = results[i];
      if (card) {
        cards.push(card);
        if (cards.length === size) {
          break;
        }
      }
    }
  }
  const hasMore = positions.some((index) => index >= nextStart);
  return { cards, nextStart, hasMore, followedSkipped };
}
