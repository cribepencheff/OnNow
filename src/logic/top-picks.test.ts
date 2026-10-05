import type { RankedRecommendation } from "./recommendations";
import { fillTopPicks } from "./top-picks";

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

  it("continues from the start it is given, and wraps around", async () => {
    const page = await fillTopPicks(
      ranking([1, 2, 3, 4, 5]),
      3,
      4,
      resolver(),
      notFollowed,
    );
    expect(page.cards.map((card) => card.tmdbId)).toEqual([4, 5, 1, 2]);
    expect(page.nextStart).toBe(2);
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

  it("is empty for an empty ranking", async () => {
    await expect(
      fillTopPicks([], 0, 10, resolver(), notFollowed),
    ).resolves.toEqual({ cards: [], nextStart: 0 });
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
