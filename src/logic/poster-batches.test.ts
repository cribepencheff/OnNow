import {
  FIRST_BATCH_SIZE,
  MORE_BATCH_SIZE,
  anchoredOffset,
  nextBatch,
  pastEnd,
  rowCards,
  visibleCards,
} from "./poster-batches";
import type { FilledPage } from "./top-picks";

function filled(
  ids: number[],
  overrides: Partial<FilledPage> = {},
): FilledPage {
  return {
    cards: ids.map((tmdbId) => ({
      tmdbId,
      tvmazeId: tmdbId + 1000,
      name: `Show ${tmdbId}`,
      posterPath: `/p${tmdbId}.jpg`,
    })),
    nextStart: 10,
    hasMore: true,
    followedSkipped: 0,
    ...overrides,
  };
}

// CRI-131: each batch continues the row; the first fills it with ten, each
// drag after adds six; the row ends with the pool.
describe("nextBatch (FR-038, FR-039, CRI-131)", () => {
  it("starts the first batch of ten at the top of the pool", async () => {
    const fill = jest.fn(async () => filled([1, 2]));
    const batch = await nextBatch(undefined, fill);
    expect(FIRST_BATCH_SIZE).toBe(10);
    expect(fill).toHaveBeenCalledWith(0, FIRST_BATCH_SIZE);
    expect(batch.index).toBe(0);
    expect(batch.cards).toHaveLength(2);
  });

  it("continues with six where the last batch stopped", async () => {
    const previous = await nextBatch(undefined, async () =>
      filled([1], { nextStart: 12 }),
    );
    const fill = jest.fn(async () => filled([2]));
    const batch = await nextBatch(previous, fill);
    expect(MORE_BATCH_SIZE).toBe(6);
    expect(fill).toHaveBeenCalledWith(12, MORE_BATCH_SIZE);
    expect(batch.index).toBe(1);
  });

  it("never starts over: a batch after the end of the pool is empty", async () => {
    const last = await nextBatch(undefined, async () =>
      filled([1], { nextStart: 30, hasMore: false }),
    );
    const fill = jest.fn(async () => filled([], { hasMore: false }));
    const batch = await nextBatch(last, fill);
    expect(fill).toHaveBeenCalledWith(30, MORE_BATCH_SIZE);
    expect(batch.cards).toEqual([]);
  });

  it('says "all followed" only of an empty first batch with followed shows', async () => {
    const empty = await nextBatch(undefined, async () =>
      filled([], { hasMore: false, followedSkipped: 4 }),
    );
    expect(empty.allFollowed).toBe(true);
    const later = await nextBatch(empty, async () =>
      filled([], { hasMore: false, followedSkipped: 2 }),
    );
    expect(later.allFollowed).toBe(false);
  });
});

describe("rowCards (CRI-131)", () => {
  it("appends batches in order, earlier cards first", () => {
    const ids = rowCards([filled([1, 2]), filled([3, 4])]).map(
      (card) => card.tmdbId,
    );
    expect(ids).toEqual([1, 2, 3, 4]);
  });

  it("keeps a show at its first place if a later batch has it again", () => {
    const ids = rowCards([filled([1, 2]), filled([2, 3])]).map(
      (card) => card.tmdbId,
    );
    expect(ids).toEqual([1, 2, 3]);
  });
});

// CRI-131: a show followed from the row stays until the screen settles
// its rows again.
describe("visibleCards (CRI-131)", () => {
  const cards = filled([1, 2, 3, 4]).cards;
  const ids = (shown: { tmdbId: number }[]) => shown.map((c) => c.tmdbId);

  it("leaves out the shows followed when the rows were settled", () => {
    const shown = visibleCards({
      cards,
      hidden: new Set([1002]),
      hasMore: true,
    });
    expect(ids(shown)).toEqual([1, 3, 4]);
  });

  it("keeps them when that would take a row under its minimum with nothing more to load (CRI-125)", () => {
    const hidden = new Set([1001, 1002]);
    expect(
      ids(visibleCards({ cards, hidden, minCards: 3, hasMore: false })),
    ).toEqual([1, 2, 3, 4]);
    // With more to load, they go, and the row loads in their place.
    expect(
      ids(visibleCards({ cards, hidden, minCards: 3, hasMore: true })),
    ).toEqual([3, 4]);
  });
});

describe("pastEnd (CRI-131)", () => {
  const row = { viewportWidth: 390, contentWidth: 1652 };

  it("is 0 anywhere before the end", () => {
    expect(pastEnd({ ...row, offsetX: 0 })).toBe(0);
    // 1652 - 390 = 1262, the strip's end.
    expect(pastEnd({ ...row, offsetX: 1262 })).toBe(0);
  });

  it("is how far the strip is dragged past its end", () => {
    expect(pastEnd({ ...row, offsetX: 1326 })).toBe(64);
  });

  it("counts from the screen's edge when the strip is shorter than the screen", () => {
    expect(pastEnd({ ...row, contentWidth: 340, offsetX: 0 })).toBe(0);
    expect(pastEnd({ ...row, contentWidth: 340, offsetX: 64 })).toBe(64);
  });
});

// CRI-131: followed shows taken out on a return to Home; the strip keeps
// its first visible card first.
describe("anchoredOffset (CRI-131)", () => {
  const stride = 162;
  const keys = (...ids: number[]) => ids.map(String);

  it("keeps the first visible card first when cards before it go", () => {
    expect(
      anchoredOffset({
        previousKeys: keys(1, 2, 3, 4, 5, 6),
        keys: keys(1, 3, 4, 5, 6),
        offsetX: 3 * stride,
        stride,
        maxOffset: 2000,
      }),
    ).toBe(2 * stride);
  });

  it("moves on to the next card that stayed when the first visible one went", () => {
    expect(
      anchoredOffset({
        previousKeys: keys(1, 2, 3, 4, 5, 6),
        // 4 was first; 3 and 4 went, so 5 comes first.
        keys: keys(1, 2, 5, 6),
        offsetX: 3 * stride,
        stride,
        maxOffset: 2000,
      }),
    ).toBe(2 * stride);
  });

  it("does not move when only cards after the first visible one go", () => {
    expect(
      anchoredOffset({
        previousKeys: keys(1, 2, 3, 4),
        keys: keys(1, 2, 3),
        offsetX: stride,
        stride,
        maxOffset: 2000,
      }),
    ).toBeNull();
  });

  it("stays within the strip's end", () => {
    expect(
      anchoredOffset({
        previousKeys: keys(1, 2, 3, 4, 5, 6),
        keys: keys(4, 5, 6),
        offsetX: 5 * stride,
        stride,
        maxOffset: 300,
      }),
    ).toBe(300);
  });
});
