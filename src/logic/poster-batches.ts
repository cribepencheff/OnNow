// The batches of a poster row, "Top picks for you" and "Airing this week"
// (FR-038, FR-039, CRI-131). Loading more is a deliberate gesture: each
// drag past the row's end loads one batch, appended, so earlier cards stay
// where they are and nothing is ever replaced. Nothing is fetched ahead:
// a batch is only fetched when a drag asks for it. A row holds at most
// MAX_ROW_CARDS: it is for sampling, not browsing. When the pool is
// exhausted, or the cap reached, the row ends.

import type { FilledPage, PosterItem } from "./top-picks";

// The first batch fills the row; each drag past the end adds a smaller one
// (CRI-131).
export const FIRST_BATCH_SIZE = 10;
export const MORE_BATCH_SIZE = 6;
// The most cards a row holds: the first batch and three drags (CRI-131).
export const MAX_ROW_CARDS = FIRST_BATCH_SIZE + 3 * MORE_BATCH_SIZE;

// The shortest time a new batch shows its skeleton cards, so it reads as
// new content arriving, even when the fetch is quicker. The old Refresh
// spinner's shortest turn.
export const MIN_LOAD_MORE_MS = 700;

// How far a row must be dragged past its end to load more.
export const LOAD_MORE_PULL = 64;

export interface Batch<Extra = object> extends FilledPage<Extra> {
  // Its place in the row: 0 for the first batch.
  index: number;
  // Cards in the row up to and including this batch.
  total: number;
  // No cards because every show is followed (not because there are none).
  // Only ever true of the first batch: the row is then empty.
  allFollowed: boolean;
}

// The batch after `previous` (or the first): from where it stopped, as
// many as a batch at its place holds, up to the row's cap. Only asked for
// while the pool has more (previous.hasMore), and never more than is left:
// a short last batch is not topped up. At the cap the row has no more.
export async function nextBatch<Extra = object>(
  previous: Batch<Extra> | undefined,
  fill: (start: number, size: number) => Promise<FilledPage<Extra>>,
): Promise<Batch<Extra>> {
  const before = previous?.total ?? 0;
  const filled = await fill(
    previous ? previous.nextStart : 0,
    Math.min(
      previous ? MORE_BATCH_SIZE : FIRST_BATCH_SIZE,
      MAX_ROW_CARDS - before,
    ),
  );
  const total = before + filled.cards.length;
  return {
    ...filled,
    hasMore: filled.hasMore && total < MAX_ROW_CARDS,
    index: previous ? previous.index + 1 : 0,
    total,
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

// The cards shown, without the shows that were followed when the screen
// last settled them (a return to the Home tab): a show followed from the
// row stays until then, so the follow can be undone (CRI-131). A row with
// a minimum ("Airing this week", CRI-125) keeps them while hiding them
// would take it under that minimum and the pool has nothing more to load
// in their place.
export function visibleCards<Card extends PosterItem>({
  cards,
  hidden,
  minCards = 0,
  hasMore,
}: {
  cards: Card[];
  hidden: ReadonlySet<number>;
  minCards?: number;
  hasMore: boolean;
}): Card[] {
  const visible = cards.filter((card) => !hidden.has(card.tvmazeId));
  return visible.length < minCards && !hasMore ? cards : visible;
}

// How far a row's strip is dragged past its end, or 0. A strip shorter
// than the screen ends at the screen's edge.
export function pastEnd({
  offsetX,
  viewportWidth,
  contentWidth,
}: {
  offsetX: number;
  viewportWidth: number;
  contentWidth: number;
}): number {
  return Math.max(
    0,
    offsetX + viewportWidth - Math.max(contentWidth, viewportWidth),
  );
}

// Where a row's strip rests once cards before or at its first visible card
// were taken out (followed shows, CRI-131): with the same card first, or,
// when that one went, the next card that stayed. null when the strip need
// not move. `stride` is a card and its gap; a strip always rests with a
// card at the left margin.
export function anchoredOffset({
  previousKeys,
  keys,
  offsetX,
  stride,
  maxOffset,
}: {
  previousKeys: readonly string[];
  keys: readonly string[];
  offsetX: number;
  stride: number;
  maxOffset: number;
}): number | null {
  const firstVisible = Math.round(offsetX / stride);
  const remaining = new Set(keys);
  const anchor = previousKeys
    .slice(firstVisible)
    .find((key) => remaining.has(key));
  if (anchor === undefined) {
    return null;
  }
  const offset = Math.min(
    keys.indexOf(anchor) * stride,
    Math.max(0, maxOffset),
  );
  return offset === offsetX ? null : offset;
}
