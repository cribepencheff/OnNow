import { formatLabelDate, nextEpisodeLabel } from "./next-episode-label";
import type { TvMazeEpisode, TvMazeSeason } from "@/api/tvmaze-types";
import showAKnightFixture from "@/api/fixtures/show-a-knight-of-the-seven-kingdoms.json";
import showSiloFixture from "@/api/fixtures/show-silo.json";

// A regular episode by default (S1E5); pass `number: 1` for a season
// premiere (CRI-78).
function episode(
  airdate: string,
  { season = 1, number = 5 }: { season?: number; number?: number } = {},
): TvMazeEpisode {
  return {
    id: 1,
    url: "",
    name: "Episode",
    season,
    number,
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

  // CRI-78: an announced season's premiere date is a season premiere in
  // TVmaze's own terms, so it reads like episode 1 of a season does.
  it("FR-025: labels an announced season's premiere date as a season premiere", () => {
    expect(
      nextEpisodeLabel(
        { kind: "announced-season", season: season("2026-12-01") },
        "UTC",
        "2026-09-21",
      ),
    ).toBe("Season 2 premiere · Tue 1 Dec");
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
  // same reference "today". S1E1 is a season premiere (CRI-78).
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
    ).toBe("Season 1 premiere · Sun 18 Jan");
  });
});

// CRI-78: a date in another year than today's shows its year, so a date
// far ahead does not read like one that has passed ("Fri 9 Jul" seen in
// September). Dates in the current year stay short.
describe("formatLabelDate (PRD 5.4, FR-025, CRI-78)", () => {
  it("leaves out the year for a date later this year", () => {
    expect(formatLabelDate("2026-11-20", "2026-09-24")).toBe("Fri 20 Nov");
  });

  it("includes the year for a date next year", () => {
    expect(formatLabelDate("2027-07-09", "2026-09-24")).toBe("Fri 9 Jul 2027");
  });

  it("includes the year for 2 January seen from late December", () => {
    expect(formatLabelDate("2027-01-02", "2026-12-29")).toBe("Sat 2 Jan 2027");
  });

  it("leaves out the year for a date in January seen from January", () => {
    expect(formatLabelDate("2027-01-20", "2027-01-02")).toBe("Wed 20 Jan");
  });
});

// CRI-78, data first: episode 1 of a season is that season's premiere.
// Nothing else is used to decide it.
describe("nextEpisodeLabel, season premieres (FR-025, CRI-78)", () => {
  it("labels episode 1 later this year as a season premiere", () => {
    expect(
      nextEpisodeLabel(
        {
          kind: "episode",
          episode: episode("2026-11-20", { season: 4, number: 1 }),
        },
        "UTC",
        "2026-09-24",
      ),
    ).toBe("Season 4 premiere · Fri 20 Nov");
  });

  // Silo S4E1, real fixture: 2027-07-09T12:00:00+00:00.
  it("labels Silo's season 4 premiere next year with the year, in Europe/Stockholm", () => {
    const siloS4E1 = findEpisode(showSiloFixture, 4, 1);

    expect(
      nextEpisodeLabel(
        { kind: "episode", episode: siloS4E1 },
        "Europe/Stockholm",
        "2026-09-24",
      ),
    ).toBe("Season 4 premiere · Fri 9 Jul 2027");
  });

  it("labels a season premiere the day after today as Tomorrow", () => {
    expect(
      nextEpisodeLabel(
        {
          kind: "episode",
          episode: episode("2026-09-25", { season: 4, number: 1 }),
        },
        "UTC",
        "2026-09-24",
      ),
    ).toBe("Season 4 premiere · Tomorrow");
  });

  it('shows "New today" on a season premiere\'s own release day', () => {
    expect(
      nextEpisodeLabel(
        {
          kind: "episode",
          episode: episode("2026-09-24", { season: 4, number: 1 }),
        },
        "UTC",
        "2026-09-24",
      ),
    ).toBe("New today");
  });

  it('keeps "Next:" for a regular next episode, this year and next year', () => {
    expect(
      nextEpisodeLabel(
        { kind: "episode", episode: episode("2026-11-20", { number: 2 }) },
        "UTC",
        "2026-09-24",
      ),
    ).toBe("Next: Fri 20 Nov");

    expect(
      nextEpisodeLabel(
        { kind: "episode", episode: episode("2027-07-09", { number: 2 }) },
        "UTC",
        "2026-09-24",
      ),
    ).toBe("Next: Fri 9 Jul 2027");
  });
});
