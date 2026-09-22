import { nextForShow } from "./next-episode";
import type {
  TvMazeEpisode,
  TvMazeSeason,
  TvMazeShow,
} from "@/api/tvmaze-types";
import showSlowHorsesFixture from "@/api/fixtures/show-slow-horses.json";
import showTheAgencyFixture from "@/api/fixtures/show-the-agency.json";
import showFoundationFixture from "@/api/fixtures/show-foundation.json";
import showLegendsFixture from "@/api/fixtures/show-legends.json";

type ShowWithEmbeds = TvMazeShow & {
  _embedded: { episodes: TvMazeEpisode[]; seasons: TvMazeSeason[] };
};

describe("nextForShow (FR-006, FR-035)", () => {
  it("returns the next upcoming episode when today is empty (Slow Horses)", () => {
    const fixture = showSlowHorsesFixture as unknown as ShowWithEmbeds;

    const result = nextForShow(
      fixture,
      fixture._embedded.episodes,
      fixture._embedded.seasons,
      "Europe/Stockholm",
      "2026-09-17",
    );

    expect(result).toEqual({
      kind: "episode",
      episode: expect.objectContaining({
        name: "Daddy Issues",
        season: 6,
        number: 2,
      }),
    });
  });

  it("includes today's own episode as the next episode when it airs today", () => {
    const fixture = showSlowHorsesFixture as unknown as ShowWithEmbeds;

    const result = nextForShow(
      fixture,
      fixture._embedded.episodes,
      fixture._embedded.seasons,
      "Europe/Stockholm",
      "2026-09-16",
    );

    expect(result).toEqual({
      kind: "episode",
      episode: expect.objectContaining({ name: "Circle of Life" }),
    });
  });

  it("falls back to an announced season with neither an episode count nor a date (Foundation season 4)", () => {
    const fixture = showFoundationFixture as unknown as ShowWithEmbeds;
    // No episodes at all: forces the season fallback path.
    const result = nextForShow(
      fixture,
      [],
      fixture._embedded.seasons,
      "Europe/Stockholm",
      "2026-09-21",
    );

    // Foundation season 4 has episodeOrder: null and premiereDate: null
    // (spike 0001, section 4): announced, but nothing scheduled yet.
    expect(result).toEqual({
      kind: "announced-season",
      season: expect.objectContaining({
        number: 4,
        episodeOrder: null,
        premiereDate: null,
      }),
    });
  });

  it("falls back to an announced season with an episode count but no date yet (Legends season 2)", () => {
    const fixture = showLegendsFixture as unknown as ShowWithEmbeds;

    const result = nextForShow(
      fixture,
      [],
      fixture._embedded.seasons,
      "Europe/Stockholm",
      "2026-09-21",
    );

    expect(result).toEqual({
      kind: "announced-season",
      season: expect.objectContaining({ number: 2, episodeOrder: 6 }),
    });
  });

  it("falls back to the show's status verbatim when nothing else is known (The Agency)", () => {
    const fixture = showTheAgencyFixture as unknown as ShowWithEmbeds;

    const result = nextForShow(
      fixture,
      [],
      fixture._embedded.seasons,
      "Europe/Stockholm",
      "2026-09-21",
    );

    expect(result).toEqual({ kind: "status", status: "To Be Determined" });
  });

  it("prefers a scheduled announced season over an unscheduled one when both exist", () => {
    const show = { status: "Running" } as TvMazeShow;
    const scheduledSeason = {
      number: 3,
      episodeOrder: 8,
      premiereDate: "2026-12-01",
      endDate: null,
    } as TvMazeSeason;
    const unscheduledSeason = {
      number: 4,
      episodeOrder: null,
      premiereDate: null,
      endDate: null,
    } as TvMazeSeason;

    const result = nextForShow(
      show,
      [],
      [unscheduledSeason, scheduledSeason],
      "Europe/Stockholm",
      "2026-09-21",
    );

    expect(result).toEqual({
      kind: "announced-season",
      season: scheduledSeason,
    });
  });
});
