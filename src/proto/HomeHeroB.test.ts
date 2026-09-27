// PROTOTYPE (proto/home-backdrop, not for merge): the compact carousel
// indicator's settled-pageIndex-only math (PageIndicator/Dot in
// HomeHeroB.tsx): dotWindowRange and dotKinds.

import { dotKinds, dotWindowRange } from "./HomeHeroB";

describe("dotWindowRange", () => {
  it("renders every dot, with no edge hint, when count fits within one window", () => {
    expect(dotWindowRange(5, 2)).toEqual({
      start: 0,
      end: 5,
      hasMoreLeft: false,
      hasMoreRight: false,
    });
    expect(dotWindowRange(8, 7)).toEqual({
      start: 0,
      end: 8,
      hasMoreLeft: false,
      hasMoreRight: false,
    });
  });

  it("has no left hint while pinned to the start", () => {
    expect(dotWindowRange(20, 0)).toEqual({
      start: 0,
      end: 8,
      hasMoreLeft: false,
      hasMoreRight: true,
    });
    expect(dotWindowRange(20, 4)).toEqual({
      start: 0,
      end: 8,
      hasMoreLeft: false,
      hasMoreRight: true,
    });
  });

  it("has no right hint while pinned to the end", () => {
    expect(dotWindowRange(20, 19)).toEqual({
      start: 12,
      end: 20,
      hasMoreLeft: true,
      hasMoreRight: false,
    });
    expect(dotWindowRange(20, 16)).toEqual({
      start: 12,
      end: 20,
      hasMoreLeft: true,
      hasMoreRight: false,
    });
  });

  it("has both hints once the window has slid away from either end", () => {
    expect(dotWindowRange(20, 10)).toEqual({
      start: 6,
      end: 14,
      hasMoreLeft: true,
      hasMoreRight: true,
    });
  });

  it("slides the window by one as the active page crosses its middle", () => {
    expect(dotWindowRange(20, 9)).toEqual({
      start: 5,
      end: 13,
      hasMoreLeft: true,
      hasMoreRight: true,
    });
    expect(dotWindowRange(20, 10)).toEqual({
      start: 6,
      end: 14,
      hasMoreLeft: true,
      hasMoreRight: true,
    });
  });
});

describe("dotKinds", () => {
  it("marks only the active dot, no edges, when count fits within one window", () => {
    expect(dotKinds(5, 2)).toEqual([
      { index: 0, kind: "normal" },
      { index: 1, kind: "normal" },
      { index: 2, kind: "active" },
      { index: 3, kind: "normal" },
      { index: 4, kind: "normal" },
    ]);
  });

  it("puts the active dot at the first position while pinned to the start, with only a right edge", () => {
    const kinds = dotKinds(20, 0);
    expect(kinds).toHaveLength(8);
    expect(kinds[0]).toEqual({ index: 0, kind: "active" });
    expect(kinds[7]).toEqual({ index: 7, kind: "edge" });
    expect(kinds.slice(1, 7)).toEqual(
      [1, 2, 3, 4, 5, 6].map((index) => ({ index, kind: "normal" })),
    );
  });

  it("puts the active dot at the last position while pinned to the end, with only a left edge", () => {
    const kinds = dotKinds(20, 19);
    expect(kinds).toHaveLength(8);
    expect(kinds[0]).toEqual({ index: 12, kind: "edge" });
    expect(kinds[7]).toEqual({ index: 19, kind: "active" });
  });

  it("marks both edges and the active dot in the middle once the window has slid", () => {
    const kinds = dotKinds(20, 10);
    expect(kinds).toHaveLength(8);
    expect(kinds[0]).toEqual({ index: 6, kind: "edge" });
    expect(kinds[kinds.length - 1]).toEqual({ index: 13, kind: "edge" });
    expect(kinds.find((dot) => dot.kind === "active")).toEqual({
      index: 10,
      kind: "active",
    });
  });
});
