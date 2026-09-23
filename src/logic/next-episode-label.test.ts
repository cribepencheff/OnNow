import { nextEpisodeLabel } from "./next-episode-label";
import type { TvMazeEpisode, TvMazeSeason } from "@/api/tvmaze-types";
import showAKnightFixture from "@/api/fixtures/show-a-knight-of-the-seven-kingdoms.json";

function episode(airdate: string): TvMazeEpisode {
  return {
    id: 1,
    url: "",
    name: "Episode",
    season: 1,
    number: 1,
    type: "regular",
    airdate,
    airtime: "20:00",
    airstamp: `${airdate}T20:00:00+00:00`,
    runtime: 30,
    image: null,
    summary: null,
  };
}

function season(premiereDate: string | null): TvMazeSeason {
  return {
    id: 1,
    url: "",
    number: 2,
    name: "",
    episodeOrder: null,
    premiereDate,
    endDate: null,
    network: null,
    webChannel: null,
    image: null,
    summary: null,
  };
}

function findEpisode(
  fixture: unknown,
  season: number,
  number: number,
): TvMazeEpisode {
  const episodes = (fixture as { _embedded: { episodes: TvMazeEpisode[] } })
    ._embedded.episodes;
  const found = episodes.find(
    (candidate) => candidate.season === season && candidate.number === number,
  );
  if (!found) {
    throw new Error(`Fixture episode S${season}E${number} not found`);
  }
  return found;
}

// PRD 5.4, FR-025: "New today" once the episode is out, "Next: Tomorrow"
// the day before, otherwise "Next: Tue 24 Sep". Never a time of day
// (ADR 0001); the local day comes from the episode's airstamp, not its
// airdate (ADR 0006).
describe("nextEpisodeLabel", () => {
  it('shows "New today" on the episode\'s own release day', () => {
    expect(
      nextEpisodeLabel(
        { kind: "episode", episode: episode("2026-09-21") },
        "UTC",
        "2026-09-21",
      ),
    ).toBe("New today");
  });

  it('shows "Next: Tomorrow" for an episode airing the day after today', () => {
    expect(
      nextEpisodeLabel(
        { kind: "episode", episode: episode("2026-09-22") },
        "UTC",
        "2026-09-21",
      ),
    ).toBe("Next: Tomorrow");
  });

  it("formats an episode further away as a plain date", () => {
    expect(
      nextEpisodeLabel(
        { kind: "episode", episode: episode("2026-09-25") },
        "UTC",
        "2026-09-21",
      ),
    ).toBe("Next: Fri 25 Sep");
  });

  it('shows "New today" for an announced season premiering today', () => {
    expect(
      nextEpisodeLabel(
        { kind: "announced-season", season: season("2026-09-21") },
        "UTC",
        "2026-09-21",
      ),
    ).toBe("New today");
  });

  it("formats an announced season's premiere date further away", () => {
    expect(
      nextEpisodeLabel(
        { kind: "announced-season", season: season("2026-12-01") },
        "UTC",
        "2026-09-21",
      ),
    ).toBe("Next: Tue 1 Dec");
  });

  it("shows no date yet for an announced season without a premiere date", () => {
    expect(
      nextEpisodeLabel(
        { kind: "announced-season", season: season(null) },
        "UTC",
        "2026-09-21",
      ),
    ).toBe("No date yet");
  });

  it("shows no date yet for a show with only a status", () => {
    expect(
      nextEpisodeLabel(
        { kind: "status", status: "Ended" },
        "UTC",
        "2026-09-21",
      ),
    ).toBe("No date yet");
  });

  it("shows no date yet while the show's data has not loaded", () => {
    expect(nextEpisodeLabel(undefined, "UTC", "2026-09-21")).toBe(
      "No date yet",
    );
  });

  // A Knight of the Seven Kingdoms S1E1: airdate 2026-01-18 (HBO's own time
  // zone), airstamp lands on 2026-01-19 in Stockholm but still 2026-01-18
  // in New York (see local-date.test.ts). The label must follow the
  // airstamp-derived local day, not the raw airdate, so the same episode
  // reads "New today" in one zone and a plain date in the other for the
  // same reference "today".
  it("lands on today in Europe/Stockholm but not in America/New_York, for the same airstamp", () => {
    const knightS1E1 = findEpisode(showAKnightFixture, 1, 1);

    expect(
      nextEpisodeLabel(
        { kind: "episode", episode: knightS1E1 },
        "Europe/Stockholm",
        "2026-01-19",
      ),
    ).toBe("New today");

    expect(
      nextEpisodeLabel(
        { kind: "episode", episode: knightS1E1 },
        "America/New_York",
        "2026-01-19",
      ),
    ).toBe("Next: Sun 18 Jan");
  });
});
