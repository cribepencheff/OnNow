import type { TmdbSeasonEpisode } from "@/api/tmdb-types";
import type { TvMazeEpisode } from "@/api/tvmaze-types";
import { episodeSummary, matchTmdbEpisode } from "./tmdb-episode";

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

function tmdb(overrides: Partial<TmdbSeasonEpisode> = {}): TmdbSeasonEpisode {
  return {
    episodeNumber: 9,
    airDate: "2026-11-07",
    stillPath: null,
    overview: "A secret comes out.",
    ...overrides,
  };
}

// CRI-143: the same episode on TMDB, by number and a date within a day.
describe("matchTmdbEpisode (CRI-143)", () => {
  it("matches on the number, with the date the same or a day apart", () => {
    expect(matchTmdbEpisode(episode(), [tmdb()])).toEqual(tmdb());
    expect(
      matchTmdbEpisode(episode(), [tmdb({ airDate: "2026-11-06" })]),
    ).not.toBeNull();
  });

  it("does not match another episode, a date further off, or no date", () => {
    expect(
      matchTmdbEpisode(episode(), [tmdb({ episodeNumber: 8 })]),
    ).toBeNull();
    expect(
      matchTmdbEpisode(episode(), [tmdb({ airDate: "2026-11-14" })]),
    ).toBeNull();
    expect(matchTmdbEpisode(episode(), [tmdb({ airDate: null })])).toBeNull();
    expect(matchTmdbEpisode(episode({ airdate: "" }), [tmdb()])).toBeNull();
    expect(matchTmdbEpisode(episode({ number: null }), [tmdb()])).toBeNull();
  });
});

// Owner, 2026-11-08: an episode card's text, TVmaze's, else TMDB's.
describe("episodeSummary (CRI-143)", () => {
  it("keeps TVmaze's summary when there is one", () => {
    expect(
      episodeSummary(episode({ summary: "<p>From TVmaze.</p>" }), [tmdb()]),
    ).toBe("From TVmaze.");
  });

  it("takes TMDB's overview for the same episode without one", () => {
    expect(episodeSummary(episode(), [tmdb()])).toBe("A secret comes out.");
  });

  it("is null with neither, or with only another episode's text (data first)", () => {
    expect(episodeSummary(episode(), [tmdb({ overview: null })])).toBeNull();
    expect(
      episodeSummary(episode(), [tmdb({ airDate: "2026-11-14" })]),
    ).toBeNull();
    expect(episodeSummary(episode(), [])).toBeNull();
  });
});
