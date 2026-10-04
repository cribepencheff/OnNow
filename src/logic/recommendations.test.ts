import moblandRecs from "@/api/fixtures/tmdb-recommendations-mobland.json";
import slowHorsesRecs from "@/api/fixtures/tmdb-recommendations-slow-horses.json";
import { rankRecommendations } from "./recommendations";

const MOBLAND = 247718;
const SLOW_HORSES = 95480;

function rec(id: number, name = `Show ${id}`) {
  return { id, name };
}

describe("rankRecommendations (FR-038, ADR 0016)", () => {
  it("ranks titles by how many followed shows recommend them", () => {
    const ranked = rankRecommendations(
      [
        [rec(1), rec(2), rec(3)],
        [rec(3), rec(4)],
        [rec(5), rec(3), rec(4)],
      ],
      new Set(),
      10,
    );
    expect(
      ranked.map(({ recommendation, count }) => [recommendation.id, count]),
    ).toEqual([
      [3, 3],
      [4, 2],
      [1, 1],
      [5, 1],
      [2, 1],
    ]);
  });

  it("breaks ties by the best position in any list, then by id", () => {
    const ranked = rankRecommendations(
      [
        [rec(9), rec(7)],
        [rec(8), rec(6)],
      ],
      new Set(),
      10,
    );
    expect(ranked.map(({ recommendation }) => recommendation.id)).toEqual([
      8, 9, 6, 7,
    ]);
  });

  it("removes shows already followed", () => {
    const ranked = rankRecommendations(
      [
        [rec(1), rec(2)],
        [rec(2), rec(3)],
      ],
      new Set([2]),
      10,
    );
    expect(ranked.map(({ recommendation }) => recommendation.id)).toEqual([
      1, 3,
    ]);
  });

  it("counts a title once per list, and keeps only the top of the ranking", () => {
    const ranked = rankRecommendations(
      [[rec(1), rec(1), rec(2), rec(3)]],
      new Set(),
      2,
    );
    expect(ranked).toEqual([
      { recommendation: rec(1), count: 1 },
      { recommendation: rec(2), count: 1 },
    ]);
  });

  it("works on real TMDB lists (MobLand, Slow Horses), never listing a followed show", () => {
    const ranked = rankRecommendations(
      [moblandRecs.results, slowHorsesRecs.results],
      new Set([MOBLAND, SLOW_HORSES]),
      10,
    );
    expect(ranked).toHaveLength(10);
    // No overlap between these two: each list's first title leads, tied.
    expect(
      ranked
        .slice(0, 2)
        .map(({ recommendation }) => recommendation.name)
        .sort(),
    ).toEqual(["Gangs of London", "Spooks"]);
    expect(
      ranked.some(({ recommendation }) =>
        [MOBLAND, SLOW_HORSES].includes(recommendation.id),
      ),
    ).toBe(false);
  });

  it("is empty with no followed shows", () => {
    expect(rankRecommendations([], new Set(), 10)).toEqual([]);
  });
});
