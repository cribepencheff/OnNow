// The batches of a poster row, "Top picks for you" and "Airing this week"
// (FR-038, FR-039, CRI-131). A row loads more as it is swiped towards its
// end: each batch continues where the last one stopped and is appended, so
// earlier cards stay where they are and nothing is ever replaced. When the
// pool is exhausted the row simply ends. The next batch is prepared one
// ahead (CRI-127), so it is usually ready before the swipe gets there.

import type { FilledPage, PosterItem } from "./top-picks";

export interface Batch<Extra = object> extends FilledPage<Extra> {
  // Its place in the row: 0 for the first batch.
  index: number;
  // No cards because every show is followed (not because there are none).
  // Only ever true of the first batch: the row is then empty.
  allFollowed: boolean;
}

// The batch after `previous` (or the first): from where it stopped. Only
// asked for while the pool has more (previous.hasMore).
export async function nextBatch<Extra = object>(
  previous: Batch<Extra> | undefined,
  fill: (start: number) => Promise<FilledPage<Extra>>,
): Promise<Batch<Extra>> {
  const filled = await fill(previous ? previous.nextStart : 0);
  return {
    ...filled,
    index: previous ? previous.index + 1 : 0,
    allFollowed:
      !previous && filled.cards.length === 0 && filled.followedSkipped > 0,
  };
}

// The row's cards: every loaded batch, in order, each show once. Batches
// never overlap in the ranking, but the data a later batch is filled from
// can be fetched again meanwhile (a new day), so a show is kept at its
// first place rather than shown twice.
export function rowCards<Card extends PosterItem>(
  batches: { cards: Card[] }[],
): Card[] {
  const seen = new Set<number>();
  const cards: Card[] = [];
  for (const batch of batches) {
    for (const card of batch.cards) {
      if (!seen.has(card.tmdbId)) {
        seen.add(card.tmdbId);
        cards.push(card);
      }
    }
  }
  return cards;
}

// How many cards before the end a row starts loading its next batch: a few,
// so it is usually in before the swipe gets there.
export const LOAD_MORE_AHEAD_CARDS = 3;

// Whether a row's strip is scrolled within `aheadWidth` of its end.
export function isNearEnd({
  offsetX,
  viewportWidth,
  contentWidth,
  aheadWidth,
}: {
  offsetX: number;
  viewportWidth: number;
  contentWidth: number;
  aheadWidth: number;
}): boolean {
  return offsetX + viewportWidth >= contentWidth - aheadWidth;
}
