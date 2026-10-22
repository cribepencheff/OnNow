import {
  largestSavedQueries,
  savedCacheBreakdown,
} from "./saved-cache-breakdown";

// What the saved query cache holds, per kind of data (ADR 0017), for the
// dev readout: which kind takes the space.
describe("savedCacheBreakdown", () => {
  it("sums each kind's size and count, largest first", () => {
    const saved = JSON.stringify({
      timestamp: 1,
      buster: "",
      clientState: {
        mutations: [],
        queries: [
          { queryKey: ["show", 1], state: { data: "x".repeat(100) } },
          { queryKey: ["show", 2], state: { data: "x".repeat(100) } },
          { queryKey: ["followedIds"], state: { data: [1, 2] } },
        ],
      },
    });
    const kinds = savedCacheBreakdown(saved);
    expect(kinds.map((kind) => [kind.kind, kind.count])).toEqual([
      ["show", 2],
      ["followedIds", 1],
    ]);
    expect(kinds[0].bytes).toBeGreaterThan(200);
  });

  it("is empty for nothing saved, or a copy it cannot read", () => {
    expect(savedCacheBreakdown(null)).toEqual([]);
    expect(savedCacheBreakdown("not json")).toEqual([]);
  });
});

describe("largestSavedQueries", () => {
  it("lists the largest entries by key", () => {
    const saved = JSON.stringify({
      clientState: {
        queries: [
          { queryKey: ["show", 1], state: { data: "x".repeat(10) } },
          { queryKey: ["show", 2], state: { data: "x".repeat(500) } },
          { queryKey: ["followedIds"], state: { data: [1] } },
        ],
      },
    });
    expect(largestSavedQueries(saved, 2).map(({ key }) => key)).toEqual([
      '["show",2]',
      '["show",1]',
    ]);
  });
});
