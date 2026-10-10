// Poster rows rest with a card at the left margin (CRI-127).

import { posterSnapOffsets } from "./poster-snap";

const row = { cardWidth: 150, gap: 8, margin: 16, viewportWidth: 390 };

describe("posterSnapOffsets (CRI-127)", () => {
  it("puts each card at the left margin", () => {
    const offsets = posterSnapOffsets({ ...row, count: 10 });
    expect(offsets.slice(0, 4)).toEqual([0, 158, 316, 474]);
  });

  it("ends with the last card at the right margin", () => {
    const offsets = posterSnapOffsets({ ...row, count: 10 });
    // 16 + 10 × 150 + 9 × 8 + 16 = 1604 wide, 390 on screen.
    expect(offsets[offsets.length - 1]).toBe(1604 - 390);
    const lastCardRight = 16 + 10 * 150 + 9 * 8 - offsets[offsets.length - 1];
    expect(lastCardRight).toBe(390 - 16);
  });

  it("never stops past the end, and never twice at it", () => {
    const offsets = posterSnapOffsets({ ...row, count: 10 });
    const end = offsets[offsets.length - 1];
    expect(offsets.filter((offset) => offset >= end)).toEqual([end]);
    expect([...offsets].sort((a, b) => a - b)).toEqual(offsets);
  });

  it("only rests at the start when every card fits", () => {
    expect(posterSnapOffsets({ ...row, count: 2 })).toEqual([0]);
    expect(posterSnapOffsets({ ...row, count: 0 })).toEqual([0]);
  });
});
