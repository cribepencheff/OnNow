// PROTOTYPE (proto/home-backdrop, not for merge): backdropPickTrigger's
// re-pick window (HERO_BACKDROP_LEAD_DAYS, HERO_BACKDROP_SETTLE_DAYS).
// Also chooseHighestRatedBackdrop, the home hero backdrop fallback's
// textless-preferred, highest-rated ranking.

import { chooseHighestRatedBackdrop, backdropPickTrigger } from "./images";
import type { TmdbImage } from "./images";

const STORED = { pickedForReleaseDate: "2026-06-01" };

function image(overrides: Partial<TmdbImage>): TmdbImage {
  return {
    file_path: "/x.jpg",
    iso_639_1: null,
    vote_average: 0,
    vote_count: 0,
    width: 1280,
    height: 720,
    ...overrides,
  };
}

describe("backdropPickTrigger", () => {
  it("picks immediately when nothing is stored yet (followed), regardless of dates", () => {
    expect(backdropPickTrigger(null, "2026-06-10", null, null)).toEqual({
      should: true,
      reason: "followed",
      releaseDate: null,
    });
  });

  it("re-picks the day before an upcoming release (lead-in window)", () => {
    expect(
      backdropPickTrigger(STORED, "2026-06-09", "2026-06-01", "2026-06-10"),
    ).toEqual({
      should: true,
      reason: "new-episode",
      releaseDate: "2026-06-01",
    });
  });

  it("does not yet re-pick two days before an upcoming release (outside the 1-day lead-in)", () => {
    expect(
      backdropPickTrigger(STORED, "2026-06-08", "2026-06-01", "2026-06-10"),
    ).toEqual({ should: false });
  });

  it("re-picks on the release day itself (start of the settle window)", () => {
    expect(
      backdropPickTrigger(STORED, "2026-06-01", "2026-06-01", "2026-06-10"),
    ).toEqual({
      should: true,
      reason: "new-episode",
      releaseDate: "2026-06-01",
    });
  });

  it("re-picks up to 3 days after a release (settle window)", () => {
    expect(
      backdropPickTrigger(STORED, "2026-06-04", "2026-06-01", null),
    ).toEqual({
      should: true,
      reason: "new-episode",
      releaseDate: "2026-06-01",
    });
  });

  it("does not re-pick once the settle window has passed", () => {
    expect(
      backdropPickTrigger(STORED, "2026-06-05", "2026-06-01", null),
    ).toEqual({ should: false });
  });

  it("does not re-pick with no stored backdrop trigger dates in range and nothing upcoming", () => {
    expect(
      backdropPickTrigger(
        { pickedForReleaseDate: "2026-05-01" },
        "2026-06-15",
        "2026-05-01",
        null,
      ),
    ).toEqual({ should: false });
  });

  it("re-picks when both windows could apply, using the latest release date", () => {
    // Today sits in the settle window of the last release and the lead-in
    // of the next one at once; either is enough to open the window.
    expect(
      backdropPickTrigger(STORED, "2026-06-02", "2026-06-01", "2026-06-03"),
    ).toEqual({
      should: true,
      reason: "new-episode",
      releaseDate: "2026-06-01",
    });
  });
});

describe("chooseHighestRatedBackdrop", () => {
  it("picks the highest-rated textless backdrop over a higher-rated non-textless one", () => {
    const best = image({
      file_path: "/textless-best.jpg",
      iso_639_1: null,
      vote_average: 7,
      vote_count: 10,
    });
    const higherRatedButLabelled = image({
      file_path: "/labelled.jpg",
      iso_639_1: "en",
      vote_average: 9,
      vote_count: 100,
    });
    expect(
      chooseHighestRatedBackdrop({
        backdrops: [higherRatedButLabelled, best],
      }),
    ).toEqual(best);
  });

  it("ties on vote_average, tie-broken by vote_count", () => {
    const moreVotes = image({
      file_path: "/more-votes.jpg",
      vote_average: 8,
      vote_count: 50,
    });
    const fewerVotes = image({
      file_path: "/fewer-votes.jpg",
      vote_average: 8,
      vote_count: 5,
    });
    expect(
      chooseHighestRatedBackdrop({ backdrops: [fewerVotes, moreVotes] }),
    ).toEqual(moreVotes);
  });

  it("treats xx (no dialogue) as textless too, same as textlessBackdrops", () => {
    const xx = image({ file_path: "/xx.jpg", iso_639_1: "xx" });
    expect(chooseHighestRatedBackdrop({ backdrops: [xx] })).toEqual(xx);
  });

  it("falls back to the same ranking over every backdrop when none are textless", () => {
    const best = image({
      file_path: "/labelled-best.jpg",
      iso_639_1: "en",
      vote_average: 9,
      vote_count: 10,
    });
    const worse = image({
      file_path: "/labelled-worse.jpg",
      iso_639_1: "fr",
      vote_average: 3,
      vote_count: 10,
    });
    expect(chooseHighestRatedBackdrop({ backdrops: [worse, best] })).toEqual(
      best,
    );
  });

  it("returns null when there are no backdrops at all", () => {
    expect(chooseHighestRatedBackdrop({})).toBeNull();
    expect(chooseHighestRatedBackdrop({ backdrops: [] })).toBeNull();
  });
});
