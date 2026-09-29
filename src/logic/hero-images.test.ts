// chooseHighestRatedBackdrop, the home hero backdrop fallback's
// textless-preferred, highest-rated ranking.

import { chooseHighestRatedBackdrop } from "./hero-images";
import type { TmdbImage } from "@/api/tmdb-types";

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
