import { isNearEnd, nextBatch, rowCards } from "./poster-batches";
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

// CRI-131: each batch continues the row; the row ends with the pool.
describe("nextBatch (FR-038, FR-039, CRI-131)", () => {
  it("starts the first batch at the top of the pool", async () => {
    const fill = jest.fn(async () => filled([1, 2]));
    const batch = await nextBatch(undefined, fill);
    expect(fill).toHaveBeenCalledWith(0);
    expect(batch.index).toBe(0);
    expect(batch.cards).toHaveLength(2);
  });

  it("continues where the last batch stopped", async () => {
    const previous = await nextBatch(undefined, async () =>
      filled([1], { nextStart: 12 }),
    );
    const fill = jest.fn(async () => filled([2]));
    const batch = await nextBatch(previous, fill);
    expect(fill).toHaveBeenCalledWith(12);
    expect(batch.index).toBe(1);
  });

  it("never starts over: a batch after the end of the pool is empty", async () => {
    const last = await nextBatch(undefined, async () =>
      filled([1], { nextStart: 30, hasMore: false }),
    );
    const fill = jest.fn(async () => filled([], { hasMore: false }));
    const batch = await nextBatch(last, fill);
    expect(fill).toHaveBeenCalledWith(30);
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

describe("isNearEnd (CRI-131)", () => {
  const row = { viewportWidth: 390, contentWidth: 1652, aheadWidth: 486 };

  it("is not near the end at the start of a long row", () => {
    expect(isNearEnd({ ...row, offsetX: 0 })).toBe(false);
  });

  it("is near the end within the given width of it", () => {
    // 1652 - 390 - 486 = 776.
    expect(isNearEnd({ ...row, offsetX: 775 })).toBe(false);
    expect(isNearEnd({ ...row, offsetX: 776 })).toBe(true);
  });

  it("is near the end when everything fits", () => {
    expect(isNearEnd({ ...row, offsetX: 0, contentWidth: 340 })).toBe(true);
  });
});
