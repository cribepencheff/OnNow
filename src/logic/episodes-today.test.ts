import { findShowsWithEpisodeToday } from "./episodes-today";
import type { TvMazeEpisode, TvMazeShow } from "@/api/tvmaze-types";
import showAKnightFixture from "@/api/fixtures/show-a-knight-of-the-seven-kingdoms.json";
import showTheBearFixture from "@/api/fixtures/show-the-bear.json";
import showSlowHorsesFixture from "@/api/fixtures/show-slow-horses.json";

function makeShow(overrides: Partial<TvMazeShow> = {}): TvMazeShow {
  return {
    id: 1,
    url: "https://www.tvmaze.com/shows/1",
    name: "Test Show",
    type: "Scripted",
    language: "English",
    genres: [],
    status: "Running",
    runtime: null,
    averageRuntime: 30,
    premiered: "2020-01-01",
    ended: null,
    officialSite: null,
    network: null,
    webChannel: null,
    image: null,
    summary: null,
    _links: { self: { href: "https://api.tvmaze.com/shows/1" } },
    ...overrides,
  };
}

function makeEpisode(overrides: Partial<TvMazeEpisode>): TvMazeEpisode {
  return {
    id: 1,
    url: "https://www.tvmaze.com/episodes/1",
    name: "Episode",
    season: 1,
    number: 1,
    type: "regular",
    airdate: "2026-09-21",
    airtime: "20:00",
    airstamp: "2026-09-21T18:00:00+00:00",
    runtime: 45,
    image: null,
    summary: null,
    ...overrides,
  };
}

describe("findShowsWithEpisodeToday (FR-004)", () => {
  it("includes a followed show with an episode airing today in Stockholm", () => {
    const show = makeShow({ name: "Silo" });
    const episode = makeEpisode({ airstamp: "2026-09-21T18:00:00+00:00" });

    const result = findShowsWithEpisodeToday(
      [{ show, episodes: [episode] }],
      "Europe/Stockholm",
      "2026-09-21",
    );

    expect(result).toEqual([{ show, episodes: [episode] }]);
  });

  it("excludes a followed show with no episode airing today", () => {
    const show = makeShow({ name: "Silo" });
    const episode = makeEpisode({ airstamp: "2026-09-20T18:00:00+00:00" });

    const result = findShowsWithEpisodeToday(
      [{ show, episodes: [episode] }],
      "Europe/Stockholm",
      "2026-09-21",
    );

    expect(result).toEqual([]);
  });

  it("uses the local date derived from airstamp, not airdate, for an HBO late-evening episode", () => {
    const show = showAKnightFixture as unknown as TvMazeShow;
    const episodes = (
      showAKnightFixture as unknown as {
        _embedded: { episodes: TvMazeEpisode[] };
      }
    )._embedded.episodes;
    // S1E1: airdate 2026-01-18 (network time zone), airstamp lands on
    // 2026-01-19 in Stockholm (ADR 0006).
    const episode = episodes.find(
      (candidate) => candidate.season === 1 && candidate.number === 1,
    );
    if (!episode) {
      throw new Error("Fixture episode S1E1 not found");
    }

    const resultOnAirdate = findShowsWithEpisodeToday(
      [{ show, episodes: [episode] }],
      "Europe/Stockholm",
      episode.airdate,
    );
    const resultOnStockholmDate = findShowsWithEpisodeToday(
      [{ show, episodes: [episode] }],
      "Europe/Stockholm",
      "2026-01-19",
    );

    expect(resultOnAirdate).toEqual([]);
    expect(resultOnStockholmDate).toHaveLength(1);
  });

  it("groups several episodes of one show on the same day into one item (FR-012, whole-season release)", () => {
    const showFixture = showTheBearFixture as unknown as TvMazeShow;
    const episodesFixture = (
      showTheBearFixture as unknown as {
        _embedded: { episodes: TvMazeEpisode[] };
      }
    )._embedded.episodes;
    const seasonFiveEpisodes = episodesFixture.filter(
      (episode) => episode.season === 5,
    );

    const result = findShowsWithEpisodeToday(
      [{ show: showFixture, episodes: seasonFiveEpisodes }],
      "Europe/Stockholm",
      "2026-06-25",
    );

    expect(result).toHaveLength(1);
    expect(result[0].episodes).toHaveLength(seasonFiveEpisodes.length);
  });

  it("returns an empty list when no followed show has an episode today", () => {
    const showFixture = showSlowHorsesFixture as unknown as TvMazeShow;
    const episodesFixture = (
      showSlowHorsesFixture as unknown as {
        _embedded: { episodes: TvMazeEpisode[] };
      }
    )._embedded.episodes;

    const result = findShowsWithEpisodeToday(
      [{ show: showFixture, episodes: episodesFixture }],
      "Europe/Stockholm",
      "1999-01-01",
    );

    expect(result).toEqual([]);
  });
});
