import type { TmdbSeasonEpisode } from "@/api/tmdb-types";
import type { TvMazeEpisode } from "@/api/tvmaze-types";
import { episodeImage } from "./episode-image";

const BASE = "https://image.tmdb.org/t/p";

function episode(overrides: Partial<TvMazeEpisode> = {}): TvMazeEpisode {
  return {
    id: 1,
    url: "",
    name: "Episode 9",
    season: 1,
    number: 9,
    type: "regular",
    airdate: "2026-11-07",
    airtime: "21:10",
    airstamp: "2026-11-07T12:10:00+00:00",
    runtime: 70,
    image: null,
    summary: null,
    ...overrides,
  };
}

const TVMAZE_IMAGE = {
  medium: "https://static.tvmaze.com/medium.jpg",
  original: "https://static.tvmaze.com/original.jpg",
};

function still(overrides: Partial<TmdbSeasonEpisode> = {}): TmdbSeasonEpisode {
  return {
    episodeNumber: 9,
    airDate: "2026-11-07",
    stillPath: "/still9.jpg",
    overview: null,
    ...overrides,
  };
}

// CRI-143, owner 2026-11-08: TMDB's still first, then TVmaze's, then the
// show's backdrop (marked, so the card can dim it), then nothing.
describe("episodeImage (CRI-143)", () => {
  it("takes TMDB's still first (100 Days of Deception, episode 9)", () => {
    expect(
      episodeImage(
        episode({ image: TVMAZE_IMAGE }),
        [still()],
        "/backdrop.jpg",
      ),
    ).toEqual({ uri: `${BASE}/original/still9.jpg`, showImage: false });
  });

  it("takes TMDB's still a day apart, as TMDB and TVmaze can date it", () => {
    expect(
      episodeImage(episode(), [still({ airDate: "2026-11-08" })], null),
    ).toEqual({ uri: `${BASE}/original/still9.jpg`, showImage: false });
  });

  it("skips TMDB's still when its date says it is another episode", () => {
    // TMDB numbers the season another way: its episode 9 is a week off.
    expect(
      episodeImage(
        episode({ image: TVMAZE_IMAGE }),
        [still({ airDate: "2026-11-14" })],
        null,
      ),
    ).toEqual({ uri: TVMAZE_IMAGE.original, showImage: false });
  });

  it("skips TMDB's still without a date to check against", () => {
    expect(
      episodeImage(episode(), [still({ airDate: null })], "/backdrop.jpg"),
    ).toEqual({ uri: `${BASE}/w780/backdrop.jpg`, showImage: true });
  });

  it("falls back to TVmaze's still without one on TMDB", () => {
    expect(
      episodeImage(
        episode({ image: TVMAZE_IMAGE }),
        [still({ stillPath: null })],
        "/backdrop.jpg",
      ),
    ).toEqual({ uri: TVMAZE_IMAGE.original, showImage: false });
    expect(
      episodeImage(
        episode({ image: { medium: "m.jpg", original: null } }),
        [],
        null,
      ),
    ).toEqual({ uri: "m.jpg", showImage: false });
  });

  it("falls back to the show's backdrop, marked as the show's", () => {
    expect(episodeImage(episode(), [], "/backdrop.jpg")).toEqual({
      uri: `${BASE}/w780/backdrop.jpg`,
      showImage: true,
    });
  });

  it("is null with no image anywhere (data first)", () => {
    expect(episodeImage(episode(), [], null)).toBeNull();
  });
});
