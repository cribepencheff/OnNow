// Where a poster row's strip may come to rest (CRI-127): every swipe ends
// with a card at the left margin, never halfway, and the last stop puts
// the last card at the right margin. Offsets for ScrollView's
// snapToOffsets.

// A poster card's width: about 150, two full cards and a peek of the third
// (CRI-127).
export const POSTER_CARD_WIDTH = 150;
// The screen margin either side of a row's strip.
export const POSTER_ROW_MARGIN = 16;
// The poster rows' spacing (owner, CRI-127): between cards, and above the
// first row's heading. Between two rows, the slot under a row is the
// space (CRI-131).
export const POSTER_CARD_GAP = 12;
export const POSTER_ROW_TOP_MARGIN = 32;

// The widest phone the app is laid out for (iPhone Pro Max, 440).
export const WIDEST_PHONE_WIDTH = 440;

// How many cards a row shows on a screen this wide, a peeking card
// included: the first starts at the margin, each next one a card and a gap
// further.
export function cardsInView(viewportWidth: number): number {
  const visible = viewportWidth - POSTER_ROW_MARGIN;
  return Math.max(
    1,
    Math.ceil(visible / (POSTER_CARD_WIDTH + POSTER_CARD_GAP)),
  );
}

// "Airing this week" always has at least as many cards as fit on the
// screen (CRI-125): as many as the widest phone shows.
export const MIN_AIRING_CARDS = cardsInView(WIDEST_PHONE_WIDTH);

export function posterSnapOffsets({
  count,
  cardWidth,
  gap,
  margin,
  viewportWidth,
}: {
  count: number;
  cardWidth: number;
  gap: number;
  // The strip's padding at either end, the screen margin.
  margin: number;
  viewportWidth: number;
}): number[] {
  if (count === 0) {
    return [0];
  }
  const contentWidth = 2 * margin + count * cardWidth + (count - 1) * gap;
  const end = Math.max(0, contentWidth - viewportWidth);
  const offsets: number[] = [];
  for (let index = 0; index < count; index += 1) {
    // Card `index` at the left margin.
    const offset = index * (cardWidth + gap);
    if (offset >= end) {
      break;
    }
    offsets.push(offset);
  }
  offsets.push(end);
  return offsets;
}
