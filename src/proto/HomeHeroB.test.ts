// PROTOTYPE (proto/home-backdrop, not for merge): the compact carousel
// indicator's settled-pageIndex-only math (PageIndicator/Dot in
// HomeHeroB.tsx): dotWindowRange and dotKinds. Also pagingReleaseTarget, the
// page a manual swipe commits to at release (onScrollEndDrag), ahead of the
// full momentum tail; pullStretchTransform, the pull-to-refresh backdrop
// stretch's top-pin + zoom math; and the bidirectional loop's physical/
// logical index mapping (loopSlideData, logicalToPhysical,
// physicalToLogical, isLoopWrapSlot, contentMountFrames).

import {
  contentMountFrames,
  dotKinds,
  dotWindowRange,
  isLoopWrapSlot,
  logicalToPhysical,
  loopSlideData,
  pagingReleaseTarget,
  physicalToLogical,
  pullStretchTransform,
} from "./HomeHeroB";

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

describe("pagingReleaseTarget", () => {
  const PAGE_WIDTH = 390;

  it("trusts a native target offset directly, over offset or velocity", () => {
    expect(
      pagingReleaseTarget(
        100, // offset: nowhere near the target, must be ignored
        PAGE_WIDTH,
        5,
        2,
        -5, // velocity: pointing the wrong way, must also be ignored
        3 * PAGE_WIDTH,
      ),
    ).toBe(3);
  });

  it("still clamps a native target to at most one page from the start page", () => {
    expect(pagingReleaseTarget(100, PAGE_WIDTH, 5, 2, 0, 4 * PAGE_WIDTH)).toBe(
      3,
    );
  });

  it("clamps a native target at the last page, not past it", () => {
    expect(pagingReleaseTarget(100, PAGE_WIDTH, 5, 4, 0, 5 * PAGE_WIDTH)).toBe(
      4,
    );
  });

  it("without a native target, pages forward on a fast flick that never reaches the halfway offset", () => {
    expect(
      pagingReleaseTarget(
        2 * PAGE_WIDTH + 0.15 * PAGE_WIDTH,
        PAGE_WIDTH,
        5,
        2,
        0.6,
        null,
      ),
    ).toBe(3);
  });

  it("without a native target, pages forward on a slow drag released past the halfway offset", () => {
    expect(
      pagingReleaseTarget(
        2 * PAGE_WIDTH + 0.65 * PAGE_WIDTH,
        PAGE_WIDTH,
        5,
        2,
        0.01, // negligible velocity: a slow drag, not a flick
        null,
      ),
    ).toBe(3);
  });

  it("without a native target, stays on the start page for an aborted drag (past the middle and back)", () => {
    expect(
      pagingReleaseTarget(
        2 * PAGE_WIDTH + 0.05 * PAGE_WIDTH,
        PAGE_WIDTH,
        5,
        2,
        -0.5, // still moving back toward the start page at release
        null,
      ),
    ).toBe(2);
  });

  it("without a native target, still never skips more than one page even with a huge velocity", () => {
    expect(
      pagingReleaseTarget(
        2 * PAGE_WIDTH + 0.05 * PAGE_WIDTH,
        PAGE_WIDTH,
        5,
        2,
        50,
        null,
      ),
    ).toBe(3);
  });
});

describe("pullStretchTransform", () => {
  const BACKDROP_HEIGHT = 580;

  // Reconstructs the same absolute-position math the comment above
  // pullStretchTransform derives from: a transform's scale is anchored at
  // the element's own center, so a point at local offset `y` from an
  // untransformed backdropHeight-tall element's top maps to
  // center + (y - center) * scale + translateY, relative to the wrapper's
  // own container. containerY is constant (not containerRestY +
  // pullDistance): this function assumes its container is already pinned
  // at a fixed screen position by a separate transform (HeroPager's own
  // pagerPinTranslateY), which is exactly what these tests are checking
  // this function's formula is consistent with.
  function absoluteEdge(
    localY: number,
    pullDistance: number,
    backdropHeight: number,
    containerY: number,
  ): number {
    const { translateY, scale } = pullStretchTransform(
      pullDistance,
      backdropHeight,
    );
    const center = backdropHeight / 2;
    return containerY + center + (localY - center) * scale + translateY;
  }

  it("is the identity transform at rest (no pull)", () => {
    expect(pullStretchTransform(0, BACKDROP_HEIGHT)).toEqual({
      translateY: 0,
      scale: 1,
    });
  });

  it("never shrinks the backdrop below its resting height", () => {
    expect(pullStretchTransform(50, BACKDROP_HEIGHT).scale).toBeGreaterThan(1);
  });

  it("keeps the backdrop's absolute top edge pinned regardless of pull distance, given an already-pinned container", () => {
    const containerY = 100;
    for (const pullDistance of [0, 10, 40, 132.5]) {
      expect(
        absoluteEdge(0, pullDistance, BACKDROP_HEIGHT, containerY),
      ).toBeCloseTo(containerY);
    }
  });

  it("grows the backdrop's absolute bottom edge by exactly the pull distance, matching the foreground's own (separate, unpinned) shift", () => {
    const containerY = 100;
    for (const pullDistance of [0, 10, 40, 132.5]) {
      expect(
        absoluteEdge(
          BACKDROP_HEIGHT,
          pullDistance,
          BACKDROP_HEIGHT,
          containerY,
        ),
      ).toBeCloseTo(containerY + BACKDROP_HEIGHT + pullDistance);
    }
  });
});

describe("loopSlideData", () => {
  it("adds no duplicates for 0 or 1 slides", () => {
    expect(loopSlideData([])).toEqual([]);
    expect(loopSlideData(["a"])).toEqual(["a"]);
  });

  it("pads a duplicate of the last slide before the first, and of the first after the last", () => {
    expect(loopSlideData(["a", "b", "c"])).toEqual(["c", "a", "b", "c", "a"]);
  });

  it("pads the same way for exactly 2 slides", () => {
    expect(loopSlideData(["a", "b"])).toEqual(["b", "a", "b", "a"]);
  });
});

describe("logicalToPhysical / physicalToLogical", () => {
  it("are the identity for 0 or 1 slides", () => {
    expect(logicalToPhysical(0, 1)).toBe(0);
    expect(physicalToLogical(0, 1)).toBe(0);
  });

  it("offsets by 1 for count > 1, round-tripping every real slide", () => {
    const count = 5;
    for (let logical = 0; logical < count; logical++) {
      const physical = logicalToPhysical(logical, count);
      expect(physicalToLogical(physical, count)).toBe(logical);
    }
  });

  it("maps the two duplicate wrap slots back to the last and first slide", () => {
    const count = 5;
    expect(physicalToLogical(0, count)).toBe(count - 1);
    expect(physicalToLogical(count + 1, count)).toBe(0);
  });

  it("clamps an out-of-range physical index rather than throwing", () => {
    const count = 5;
    expect(physicalToLogical(-3, count)).toBe(count - 1);
    expect(physicalToLogical(count + 10, count)).toBe(0);
  });
});

describe("isLoopWrapSlot", () => {
  it("is true only for the two duplicate slots, for count > 1", () => {
    const count = 5;
    expect(isLoopWrapSlot(0, count)).toBe(true);
    expect(isLoopWrapSlot(count + 1, count)).toBe(true);
    expect(isLoopWrapSlot(1, count)).toBe(false);
    expect(isLoopWrapSlot(count, count)).toBe(false);
  });

  it("is always false for 0 or 1 slides (no loop, nothing to wrap)", () => {
    expect(isLoopWrapSlot(0, 1)).toBe(false);
    expect(isLoopWrapSlot(0, 0)).toBe(false);
  });
});

describe("contentMountFrames", () => {
  it("mounts only the current slide for 0 or 1 slides", () => {
    expect(contentMountFrames(0, 0)).toEqual([]);
    expect(contentMountFrames(1, 0)).toEqual([0]);
  });

  it("mounts the settled page plus one logical neighbour on each side, away from either edge", () => {
    expect(contentMountFrames(5, 2)).toEqual([1, 2, 3]);
  });

  it("wraps the left neighbour to the last slide, at the first page", () => {
    expect(contentMountFrames(5, 0)).toEqual([4, 0, 1]);
  });

  it("wraps the right neighbour to the first slide, at the last page", () => {
    expect(contentMountFrames(5, 4)).toEqual([3, 4, 0]);
  });

  it("dedupes a 2-slide pager's two wrapped neighbours: both reach the same other slide", () => {
    // A single mounted instance for slide 1 is enough either way: its own
    // crossfade (logicalCrossfadePosition, periodic) already reads the
    // same regardless of which direction scrollX approaches it from.
    expect(contentMountFrames(2, 0)).toEqual([1, 0]);
  });
});
