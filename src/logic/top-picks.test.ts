import type { RankedRecommendation } from "./recommendations";
import { fillTopPicks, isTopPicksShown } from "./top-picks";

function ranking(
  ids: number[],
  noPoster: number[] = [],
): RankedRecommendation[] {
  return ids.map((id) => ({
    recommendation: {
      id,
      name: `Show ${id}`,
      poster_path: noPoster.includes(id) ? null : `/p${id}.jpg`,
    },
    count: 1,
  }));
}

// TVmaze id is TMDB id + 1000; ids in `missing` are not on TVmaze.
function resolver(missing: number[] = []) {
  return jest.fn(async (tmdbId: number) =>
    missing.includes(tmdbId) ? null : tmdbId + 1000,
  );
}

const notFollowed = () => false;

describe("fillTopPicks (FR-038)", () => {
  it("resolves in rank order and stops as soon as the row is full", async () => {
    const resolve = resolver();
    const page = await fillTopPicks(
      ranking([1, 2, 3, 4, 5]),
      0,
      3,
      resolve,
      notFollowed,
    );
    expect(page.cards.map((card) => card.tmdbId)).toEqual([1, 2, 3]);
    expect(resolve.mock.calls.map(([id]) => id)).toEqual([1, 2, 3]);
    expect(page.nextStart).toBe(3);
  });

  it("skips titles without a poster (no request), not on TVmaze, or followed", async () => {
    const resolve = resolver([2]);
    const page = await fillTopPicks(
      ranking([1, 2, 3, 4, 5, 6], [4]),
      0,
      3,
      resolve,
      (tvmazeId) => tvmazeId === 1003,
    );
    expect(page.cards.map((card) => card.tmdbId)).toEqual([1, 5, 6]);
    expect(resolve.mock.calls.map(([id]) => id)).toEqual([1, 2, 3, 5, 6]);
  });

  it("continues from the start it is given, to the end, never wrapping (CRI-123)", async () => {
    const page = await fillTopPicks(
      ranking([1, 2, 3, 4, 5]),
      3,
      4,
      resolver(),
      notFollowed,
    );
    expect(page.cards.map((card) => card.tmdbId)).toEqual([4, 5]);
    expect(page.nextStart).toBe(5);
    expect(page.hasMore).toBe(false);
  });

  it("counts the followed titles it skipped, so an empty row can say why (CRI-123)", async () => {
    const page = await fillTopPicks(
      ranking([1, 2, 3]),
      0,
      10,
      resolver(),
      (tvmazeId) => tvmazeId !== 1002,
    );
    expect(page.cards.map((card) => card.tmdbId)).toEqual([2]);
    expect(page.followedSkipped).toBe(2);
  });

  it("looks at each title at most once, even when the row cannot be filled", async () => {
    const resolve = resolver([2, 3]);
    const page = await fillTopPicks(
      ranking([1, 2, 3]),
      0,
      10,
      resolve,
      notFollowed,
    );
    expect(page.cards.map((card) => card.tmdbId)).toEqual([1]);
    expect(resolve).toHaveBeenCalledTimes(3);
  });

  it("is empty for an empty ranking, with nothing left", async () => {
    await expect(
      fillTopPicks([], 0, 10, resolver(), notFollowed),
    ).resolves.toEqual({
      cards: [],
      nextStart: 0,
      hasMore: false,
      followedSkipped: 0,
    });
  });

  it("runs an optional check after the TVmaze id, which can reject or add to a card", async () => {
    const check = jest.fn(async (tvmazeId: number, _tmdbId: number) =>
      tvmazeId === 1002 ? null : { day: "Fri" },
    );
    const page = await fillTopPicks(
      ranking([1, 2, 3]),
      0,
      2,
      resolver(),
      notFollowed,
      check,
    );
    expect(page.cards.map((card) => [card.tmdbId, card.day])).toEqual([
      [1, "Fri"],
      [3, "Fri"],
    ]);
    expect(check).toHaveBeenCalledTimes(3);
  });

  it("checks three at a time, and the next page starts right after the last card used", async () => {
    const resolve = resolver();
    const page = await fillTopPicks(
      ranking([1, 2, 3, 4, 5]),
      0,
      1,
      resolve,
      notFollowed,
    );
    expect(page.cards.map((card) => card.tmdbId)).toEqual([1]);
    // One batch of three was checked, but titles 2 and 3 come next.
    expect(resolve).toHaveBeenCalledTimes(3);
    expect(page.nextStart).toBe(1);
  });
});

// CRI-123: both rows walk their ranking once, without wrapping, and say
// whether any titles are left for a next page.
describe("fillTopPicks to the end of the ranking (FR-038, FR-039, CRI-123)", () => {
  it("fills from the start to the end of the ranking, never wrapping", async () => {
    const page = await fillTopPicks(
      ranking([1, 2, 3, 4, 5]),
      3,
      3,
      resolver(),
      notFollowed,
    );
    expect(page.cards.map((card) => card.tmdbId)).toEqual([4, 5]);
    expect(page.nextStart).toBe(5);
    expect(page.hasMore).toBe(false);
  });

  it("has more while titles are left after the page", async () => {
    const page = await fillTopPicks(
      ranking([1, 2, 3, 4, 5]),
      0,
      3,
      resolver(),
      notFollowed,
    );
    expect(page.cards.map((card) => card.tmdbId)).toEqual([1, 2, 3]);
    expect(page.nextStart).toBe(3);
    expect(page.hasMore).toBe(true);
  });

  it("has none left when only titles without a poster remain", async () => {
    const page = await fillTopPicks(
      ranking([1, 2, 3, 4, 5], [4, 5]),
      0,
      3,
      resolver(),
      notFollowed,
    );
    expect(page.hasMore).toBe(false);
  });

  it("is an empty page with none left when started at the end", async () => {
    const resolve = resolver();
    const page = await fillTopPicks(
      ranking([1, 2, 3]),
      3,
      3,
      resolve,
      notFollowed,
    );
    expect(page.cards).toEqual([]);
    expect(page.hasMore).toBe(false);
    expect(resolve).not.toHaveBeenCalled();
  });
});

// CRI-125: "Top picks for you" is hidden when it has no picks to show.
describe("isTopPicksShown (CRI-125)", () => {
  it("is hidden without followed shows", () => {
    expect(
      isTopPicksShown({ followedCount: 0, isLoading: true, hasCards: true }),
    ).toBe(false);
  });

  it("is shown, with skeleton cards, while its first batch loads", () => {
    expect(
      isTopPicksShown({ followedCount: 1, isLoading: true, hasCards: false }),
    ).toBe(true);
  });

  it("is shown with picks, hidden when the batch has none", () => {
    expect(
      isTopPicksShown({ followedCount: 2, isLoading: false, hasCards: true }),
    ).toBe(true);
    expect(
      isTopPicksShown({ followedCount: 2, isLoading: false, hasCards: false }),
    ).toBe(false);
  });
});
