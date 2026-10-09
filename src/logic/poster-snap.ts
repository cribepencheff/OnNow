// Where a poster row's strip may come to rest (CRI-127): every swipe ends
// with a card at the left margin, never halfway, and the last stop puts
// the last card at the right margin. Offsets for ScrollView's
// snapToOffsets.

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
