import { nextBatch, rowControl, type Batch } from "./poster-batches";
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

// CRI-123: "Refresh" while shows are left, "Start over" at the end of the
// pool, and an empty row only when every show is followed.
describe("nextBatch (FR-038, FR-039, CRI-123)", () => {
  it("starts the first batch at the top of the pool", async () => {
    const fill = jest.fn(async () => filled([1, 2]));
    const batch = await nextBatch(undefined, fill);
    expect(fill).toHaveBeenCalledWith(0);
    expect(batch).toMatchObject({ index: 0, control: "refresh" });
    expect(batch.cards).toHaveLength(2);
  });

  it("continues where the last batch stopped while shows are left", async () => {
    const previous = await nextBatch(undefined, async () =>
      filled([1], { nextStart: 12 }),
    );
    const fill = jest.fn(async () => filled([2]));
    const batch = await nextBatch(previous, fill);
    expect(fill).toHaveBeenCalledWith(12);
    expect(batch.index).toBe(1);
  });

  it('offers "Start over" at the end of the pool', async () => {
    const batch = await nextBatch(undefined, async () =>
      filled([1], { hasMore: false }),
    );
    expect(batch.control).toBe("startOver");
  });

  it("starts over from the top, minus followed shows, after the end", async () => {
    const last = await nextBatch(undefined, async () =>
      filled([1], { nextStart: 30, hasMore: false }),
    );
    const fill = jest.fn(async () => filled([2, 3]));
    const batch = await nextBatch(last, fill);
    expect(fill).toHaveBeenCalledWith(0);
    expect(batch.control).toBe("refresh");
  });

  it("keeps the cards and offers Start over when every show left is left out", async () => {
    const previous = await nextBatch(undefined, async () =>
      filled([1, 2], { nextStart: 20 }),
    );
    const batch = await nextBatch(previous, async () =>
      filled([], { nextStart: 33, hasMore: false }),
    );
    expect(batch.cards).toEqual(previous.cards);
    // The same batch on screen: nothing to crossfade.
    expect(batch.index).toBe(previous.index);
    expect(batch.control).toBe("startOver");
  });

  it("is empty with a reason only when every show is followed", async () => {
    const last: Batch = await nextBatch(undefined, async () =>
      filled([1], { hasMore: false }),
    );
    const batch = await nextBatch(last, async () =>
      filled([], { hasMore: false, followedSkipped: 5 }),
    );
    expect(batch.cards).toEqual([]);
    expect(batch.allFollowed).toBe(true);
    expect(batch.control).toBe("startOver");
  });

  it("is plainly empty when the pool has no shows at all", async () => {
    const batch = await nextBatch(undefined, async () =>
      filled([], { hasMore: false }),
    );
    expect(batch.cards).toEqual([]);
    expect(batch.allFollowed).toBe(false);
  });
});

// CRI-127: Refresh is hidden when the pool holds no more shows than the row
// shows; the batch prepared one ahead tells that early.
describe("rowControl (FR-038, FR-039, CRI-127)", () => {
  async function first(overrides: Partial<FilledPage> = {}) {
    return nextBatch(undefined, async () => filled([1, 2], overrides));
  }

  it("has no control before the first batch", () => {
    expect(rowControl(undefined, undefined)).toBeNull();
  });

  it("offers Refresh while shows are left", async () => {
    const current = await first();
    expect(rowControl(current, undefined)).toBe("refresh");
    const next = await nextBatch(current, async () => filled([3]));
    expect(rowControl(current, next)).toBe("refresh");
  });

  it("is hidden when the first batch is the whole pool", async () => {
    expect(rowControl(await first({ hasMore: false }), undefined)).toBeNull();
  });

  it("is hidden when the next batch would bring nothing new after the first", async () => {
    const current = await first();
    const next = await nextBatch(current, async () =>
      filled([], { hasMore: false }),
    );
    expect(rowControl(current, next)).toBeNull();
  });

  it("reads Start over at once when the next batch would bring nothing new later on", async () => {
    const current = await nextBatch(await first(), async () => filled([3]));
    const next = await nextBatch(current, async () =>
      filled([], { hasMore: false }),
    );
    expect(rowControl(current, next)).toBe("startOver");
  });

  it("reads Start over at the end of a pool larger than the row", async () => {
    const last = await nextBatch(await first(), async () =>
      filled([3], { hasMore: false }),
    );
    expect(rowControl(last, undefined)).toBe("startOver");
  });

  it("is hidden when every show is followed", async () => {
    const empty = await nextBatch(undefined, async () =>
      filled([], { hasMore: false, followedSkipped: 4 }),
    );
    expect(rowControl(empty, undefined)).toBeNull();
  });
});
