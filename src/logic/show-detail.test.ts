import {
  aboutFacts,
  allEpisodesAvailable,
  currentSeasonNumber,
  episodeBadgeLabel,
  episodeDateLabel,
  episodeOfLabel,
  episodeState,
  isFinale,
  initialEpisodeIndex,
  initialSeasonNumber,
  latestEpisode,
  regularEpisodes,
  relativeDayLabel,
  seasonTabs,
  showDetailMetaLine,
  showDetailPill,
} from "./show-detail";
import type {
  TvMazeEpisode,
  TvMazeSeason,
  TvMazeShowWithEmbeds,
} from "@/api/tvmaze-types";
import showSlowHorsesFixture from "@/api/fixtures/show-slow-horses.json";
import showSiloFixture from "@/api/fixtures/show-silo.json";
import showFoundationFixture from "@/api/fixtures/show-foundation.json";
import showKillingEveFixture from "@/api/fixtures/show-killing-eve.json";
import showNeagleyFixture from "@/api/fixtures/show-neagley.json";
import showTheDiplomatFixture from "@/api/fixtures/show-the-diplomat.json";

const slowHorses = showSlowHorsesFixture as unknown as TvMazeShowWithEmbeds;
const silo = showSiloFixture as unknown as TvMazeShowWithEmbeds;
const foundation = showFoundationFixture as unknown as TvMazeShowWithEmbeds;
const killingEve = showKillingEveFixture as unknown as TvMazeShowWithEmbeds;

const TZ = "Europe/Stockholm";
// Slow Horses S6E2 comes out on this day in Stockholm.
const TODAY = "2026-09-23";

function find(
  show: TvMazeShowWithEmbeds,
  season: number,
  number: number,
): TvMazeEpisode {
  const found = show._embedded.episodes.find(
    (episode) => episode.season === season && episode.number === number,
  );
  if (!found) {
    throw new Error(`Fixture episode S${season}E${number} not found`);
  }
  return found;
}

describe("relativeDayLabel (PRD 5.5, ADR 0001)", () => {
  it.each([
    ["2026-09-23", "Today"],
    ["2026-09-24", "Tomorrow"],
    ["2026-09-22", "Yesterday"],
    ["2026-09-26", "In 3 days"],
    ["2026-09-21", "2 days ago"],
    ["2026-09-30", "In 7 days"],
    ["2026-09-16", "7 days ago"],
  ])("labels %s as %s, seen from 2026-09-23", (date, label) => {
    expect(relativeDayLabel(date, TODAY)).toBe(label);
  });

  it("falls back to a date more than a week away, with the year in another year (CRI-78)", () => {
    expect(relativeDayLabel("2026-10-21", TODAY)).toBe("Wed 21 Oct");
    expect(relativeDayLabel("2022-04-10", TODAY)).toBe("Sun 10 Apr 2022");
  });
});

describe("showDetailMetaLine (FR-028)", () => {
  it("is year · origin country · genres, with no network", () => {
    expect(showDetailMetaLine(slowHorses, ["GB"])).toBe(
      "2022 · United Kingdom · Drama, Thriller, Espionage",
    );
  });

  it("shows only the first origin country, and at most three genres", () => {
    const fourGenres = {
      ...killingEve,
      genres: ["Drama", "Crime", "Thriller", "Comedy"],
    };
    expect(showDetailMetaLine(fourGenres, ["GB", "US", "CA"])).toBe(
      "2018 · United Kingdom · Drama, Crime, Thriller",
    );
  });

  it("drops a missing part without an empty separator", () => {
    expect(showDetailMetaLine(slowHorses, [])).toBe(
      "2022 · Drama, Thriller, Espionage",
    );
    expect(showDetailMetaLine({ ...slowHorses, genres: [] }, ["GB"])).toBe(
      "2022 · United Kingdom",
    );
    expect(
      showDetailMetaLine({ ...slowHorses, premiered: null, genres: [] }, []),
    ).toBe("");
  });

  it("drops a country code it cannot name", () => {
    expect(showDetailMetaLine({ ...slowHorses, genres: [] }, ["XX"])).toBe(
      "2022",
    );
  });
});

describe("regularEpisodes (FR-037)", () => {
  it("leaves out specials", () => {
    const special = {
      ...find(slowHorses, 6, 1),
      id: 999,
      number: null,
      type: "significant_special",
    };
    const episodes = [find(slowHorses, 6, 1), special];

    expect(regularEpisodes(episodes)).toEqual([find(slowHorses, 6, 1)]);
  });
});

describe("latestEpisode (FR-028)", () => {
  it("is the episode out today when there is one", () => {
    expect(latestEpisode(slowHorses._embedded.episodes, TZ, TODAY)).toBe(
      find(slowHorses, 6, 2),
    );
  });

  it("is the last aired episode between seasons", () => {
    expect(latestEpisode(silo._embedded.episodes, TZ, TODAY)).toBe(
      find(silo, 3, 10),
    );
  });

  it("is null before a show's first episode", () => {
    expect(latestEpisode(silo._embedded.episodes, TZ, "2020-01-01")).toBeNull();
  });
});

describe("episodeOfLabel (PRD 5.5)", () => {
  it('shows "Episode 3 of 6" from the season\'s episode order', () => {
    expect(
      episodeOfLabel(find(slowHorses, 6, 3), slowHorses._embedded.seasons),
    ).toBe("Episode 3 of 6");
  });

  it("leaves out the total when TVmaze has no episode order", () => {
    const seasons = slowHorses._embedded.seasons.map((season) => ({
      ...season,
      episodeOrder: null,
    }));
    expect(episodeOfLabel(find(slowHorses, 6, 3), seasons)).toBe("Episode 3");
  });
});

describe("episodeState and episodeDateLabel (FR-032)", () => {
  it("marks aired, today and upcoming episodes", () => {
    expect(episodeState(find(slowHorses, 6, 1), TZ, TODAY)).toBe("aired");
    expect(episodeState(find(slowHorses, 6, 2), TZ, TODAY)).toBe("today");
    expect(episodeState(find(slowHorses, 6, 3), TZ, TODAY)).toBe("upcoming");
  });

  it("labels an episode's day relative to today", () => {
    expect(episodeDateLabel(find(slowHorses, 6, 2), TZ, TODAY)).toBe("Today");
    expect(episodeDateLabel(find(slowHorses, 6, 3), TZ, TODAY)).toBe(
      "In 7 days",
    );
  });

  it('treats an episode without an airstamp as upcoming, with "TBA"', () => {
    const tba = { ...find(slowHorses, 6, 3), airdate: "", airstamp: "" };
    expect(episodeState(tba, TZ, TODAY)).toBe("upcoming");
    expect(episodeDateLabel(tba, TZ, TODAY)).toBe("TBA");
  });
});

describe("isFinale (FR-032)", () => {
  it("is the episode whose number is the season's episode order", () => {
    const seasons = slowHorses._embedded.seasons;
    expect(isFinale(find(slowHorses, 6, 6), seasons)).toBe(true);
    expect(isFinale(find(slowHorses, 6, 5), seasons)).toBe(false);
  });

  it("is never guessed when TVmaze has no episode order", () => {
    const seasons = slowHorses._embedded.seasons.map((season) => ({
      ...season,
      episodeOrder: null,
    }));
    expect(isFinale(find(slowHorses, 6, 6), seasons)).toBe(false);
  });
});

describe("seasonTabs (FR-032, FR-033)", () => {
  it("lists seasons with episodes, then announced seasons as muted tabs", () => {
    const tabs = seasonTabs(
      slowHorses._embedded.seasons,
      slowHorses._embedded.episodes,
      TODAY,
    );
    expect(tabs.map((tab) => tab.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(tabs[5]).toEqual({ number: 6, announced: false, note: null });
    expect(tabs[6]).toEqual({ number: 7, announced: true, note: "Announced" });
  });

  it("shows an announced season's premiere date on its tab", () => {
    const seasons: TvMazeSeason[] = [
      ...foundation._embedded.seasons.slice(0, 3),
      { ...foundation._embedded.seasons[3], premiereDate: "2027-07-09" },
    ];
    const tabs = seasonTabs(seasons, foundation._embedded.episodes, TODAY);
    expect(tabs[3]).toEqual({
      number: 4,
      announced: true,
      note: "Fri 9 Jul 2027",
    });
  });

  it("leaves out a season with no episodes whose premiere date has passed", () => {
    const seasons: TvMazeSeason[] = [
      ...foundation._embedded.seasons.slice(0, 3),
      { ...foundation._embedded.seasons[3], premiereDate: "2025-01-01" },
    ];
    const tabs = seasonTabs(seasons, foundation._embedded.episodes, TODAY);
    expect(tabs.map((tab) => tab.number)).toEqual([1, 2, 3]);
  });
});

describe("currentSeasonNumber (FR-032: current season, not season 1)", () => {
  it("is the season airing now", () => {
    expect(currentSeasonNumber(slowHorses._embedded.episodes, TZ, TODAY)).toBe(
      6,
    );
  });

  it("is the latest aired season between seasons", () => {
    expect(currentSeasonNumber(silo._embedded.episodes, TZ, TODAY)).toBe(3);
  });

  it("is the last season of an ended show", () => {
    expect(currentSeasonNumber(killingEve._embedded.episodes, TZ, TODAY)).toBe(
      4,
    );
  });

  it("is the first season with episodes before a show has premiered", () => {
    expect(currentSeasonNumber(silo._embedded.episodes, TZ, "2020-01-01")).toBe(
      1,
    );
  });
});
describe("allEpisodesAvailable (CRI-81)", () => {
  const neagley = showNeagleyFixture as unknown as TvMazeShowWithEmbeds;
  const diplomat = showTheDiplomatFixture as unknown as TvMazeShowWithEmbeds;

  function available(show: TvMazeShowWithEmbeds, todayDate = TODAY) {
    return allEpisodesAvailable(
      show._embedded.episodes,
      show._embedded.seasons,
      TZ,
      todayDate,
    );
  }

  it("is true when every episode of the latest season is out and matches the episode order", () => {
    expect(available(neagley)).toBe(true);
    expect(available(killingEve)).toBe(true);
  });

  it("is false before the drop", () => {
    expect(available(neagley, "2026-09-15")).toBe(false);
  });

  it("is false when a later season is listed and not out yet", () => {
    expect(available(diplomat)).toBe(false);
    expect(available(foundation)).toBe(false);
  });

  it("is false for a weekly season still airing", () => {
    expect(available(slowHorses)).toBe(false);
  });

  it("is false when TVmaze has no episode order for the season", () => {
    const seasons = neagley._embedded.seasons.map((season) => ({
      ...season,
      episodeOrder: null,
    }));
    expect(
      allEpisodesAvailable(neagley._embedded.episodes, seasons, TZ, TODAY),
    ).toBe(false);
  });
});

// Owner, 2026-11-08: the news first, then the status line the pill now
// carries in place of a line of its own.
describe("showDetailPill (CRI-143)", () => {
  const neagley = showNeagleyFixture as unknown as TvMazeShowWithEmbeds;
  const diplomat = showTheDiplomatFixture as unknown as TvMazeShowWithEmbeds;
  const STATUS = "Next ep Wed 30 Sep";

  function pill(show: TvMazeShowWithEmbeds, todayDate: string, timeZone = TZ) {
    return showDetailPill(
      show._embedded.episodes,
      show._embedded.seasons,
      timeZone,
      todayDate,
      STATUS,
    );
  }

  it('says "New season" for 7 days after a later season\'s first episode', () => {
    // Slow Horses S6E1 is out on Wed 16 Sep 2026.
    expect(pill(slowHorses, "2026-09-16")).toBe("New season");
    expect(pill(slowHorses, "2026-09-23")).toBe("New season");
    expect(pill(slowHorses, "2026-09-24")).toBe("New episodes every Wednesday");
    // The Diplomat's season 3 drop.
    expect(pill(diplomat, "2025-10-23")).toBe("New season");
  });

  it('says "All episodes now available" for 30 days after a season is complete', () => {
    // Neagley season 1 (no "New season" for a first season) drops on 16 Sep.
    expect(pill(neagley, "2026-09-16")).toBe("All episodes now available");
    expect(pill(neagley, "2026-10-16")).toBe("All episodes now available");
    expect(pill(neagley, "2026-10-17")).toBe(STATUS);
    // After the drop's "New season" week: season 4 is listed, so the show
    // is not complete.
    expect(pill(diplomat, "2025-10-24")).toBe(STATUS);
  });

  // Owner, 2026-11-08: Show detail is mostly for deciding whether to
  // follow a show, and the rhythm says more than one new episode.
  it('says "New episodes every Wednesday" for a weekly show, over New episode', () => {
    expect(pill(slowHorses, "2026-09-25")).toBe("New episodes every Wednesday");
    // An episode out today, and the next a week on.
    expect(pill(slowHorses, "2026-09-30")).toBe("New episodes every Wednesday");
    expect(pill(slowHorses, "2026-10-02")).toBe("New episodes every Wednesday");
  });

  it("names the weekday of the user's local day (ADR 0006)", () => {
    // Out at 12:00 UTC on Wednesdays: still Wednesday in Los Angeles,
    // Thursday in Auckland.
    expect(pill(slowHorses, "2026-09-26", "America/Los_Angeles")).toBe(
      "New episodes every Wednesday",
    );
    expect(pill(slowHorses, "2026-09-26", "Pacific/Auckland")).toBe(
      "New episodes every Thursday",
    );
  });

  it("names the episodes' own weekday, not TVmaze's schedule day", () => {
    // TVmaze lists Silo on Thursday; its episodes are out on Fridays here.
    expect(pill(silo, "2026-07-21")).toBe("New episodes every Friday");
  });

  it('says "New episode" today and the day after when there is no weekly rhythm, over the status', () => {
    // The finale: nothing after it, so no rhythm; seasons 7 and 8 are
    // listed, so the show is not complete.
    expect(pill(slowHorses, "2026-10-21")).toBe("New episode");
    expect(pill(slowHorses, "2026-10-22")).toBe("New episode");
  });

  it("says the status for a show between seasons, ended, or announced", () => {
    // Slow Horses after its season 6 finale, with no next episode dated.
    expect(pill(slowHorses, "2026-10-24")).toBe(STATUS);
    // Silo's season 4 premiere is a year away.
    expect(pill(silo, "2026-10-24")).toBe(STATUS);
    // The Diplomat's season 4 premiere is dated, the season 3 drop long out.
    expect(pill(diplomat, TODAY)).toBe(STATUS);
  });

  it("gives no weekly pill with a single episode out, and no new season pill for season 1", () => {
    // Slow Horses' season 6, as if it were a new show's first season.
    const firstSeason = slowHorses._embedded.episodes
      .filter((episode) => episode.season === 6)
      .map((episode) => ({ ...episode, season: 1 }));
    expect(
      showDetailPill(
        firstSeason,
        slowHorses._embedded.seasons,
        TZ,
        "2026-09-18",
        STATUS,
      ),
    ).toBe(STATUS);
  });
});

// FR-032, owner 2026-11-08: the episode row opens on the latest episode
// out, with the next one beside it; an ended show on its first episode.
describe("initialSeasonNumber and initialEpisodeIndex (FR-032)", () => {
  function seasonEpisodes(show: TvMazeShowWithEmbeds, season: number) {
    return regularEpisodes(show._embedded.episodes).filter(
      (episode) => episode.season === season,
    );
  }

  it("opens a running show on the latest episode out, today's included", () => {
    expect(
      initialSeasonNumber(slowHorses._embedded.episodes, false, TZ, TODAY),
    ).toBe(6);
    // S6E2 is out today: index 1.
    expect(
      initialEpisodeIndex(seasonEpisodes(slowHorses, 6), false, TZ, TODAY),
    ).toBe(1);
  });

  it("opens a show between seasons on its last aired season's last episode", () => {
    expect(initialSeasonNumber(silo._embedded.episodes, false, TZ, TODAY)).toBe(
      3,
    );
    const season = seasonEpisodes(silo, 3);
    expect(initialEpisodeIndex(season, false, TZ, TODAY)).toBe(
      season.length - 1,
    );
  });

  it("opens an ended show on season 1, episode 1", () => {
    expect(
      initialSeasonNumber(killingEve._embedded.episodes, true, TZ, TODAY),
    ).toBe(1);
    expect(
      initialEpisodeIndex(seasonEpisodes(killingEve, 1), true, TZ, TODAY),
    ).toBe(0);
  });

  it("opens a season with nothing out yet on its first episode", () => {
    expect(
      initialEpisodeIndex(
        seasonEpisodes(slowHorses, 6),
        false,
        TZ,
        "2020-01-01",
      ),
    ).toBe(0);
  });
});

// Owner, 2026-11-08: the About sheet's facts, from data already fetched.
describe("aboutFacts (PRD 5.5)", () => {
  it("lists premiere, seasons, episodes, runtime, origin and language (Slow Horses)", () => {
    expect(aboutFacts(slowHorses, ["GB"])).toEqual([
      { label: "Premiered", value: "2022" },
      { label: "Seasons", value: "6" },
      {
        label: "Episodes",
        value: String(regularEpisodes(slowHorses._embedded.episodes).length),
      },
      { label: "Runtime", value: "45 min" },
      { label: "Origin", value: "United Kingdom" },
      { label: "Language", value: "English" },
    ]);
  });

  it("counts only seasons with episodes, not an announced one (FR-033)", () => {
    // Slow Horses lists season 7 without episodes.
    const seasons = aboutFacts(slowHorses, []).find(
      (fact) => fact.label === "Seasons",
    );
    expect(seasons?.value).toBe("6");
  });

  it("gives a show with an end date its years, and one year once", () => {
    const years = (show: TvMazeShowWithEmbeds) =>
      aboutFacts(show, []).find((fact) => fact.label === "Years")?.value;
    expect(years(killingEve)).toBe("2018–2022");
    expect(
      years({ ...killingEve, premiered: "2022-01-01", ended: "2022-12-01" }),
    ).toBe("2022");
  });

  it("names every origin country, not only the first", () => {
    expect(
      aboutFacts(slowHorses, ["GB", "US"]).find(
        (fact) => fact.label === "Origin",
      )?.value,
    ).toBe("United Kingdom, United States");
  });

  it("leaves out what the data does not give (data first)", () => {
    const bare = {
      ...slowHorses,
      premiered: null,
      runtime: null,
      averageRuntime: null,
      language: null,
      _embedded: { episodes: [], seasons: [] },
    };
    expect(aboutFacts(bare, [])).toEqual([]);
  });
});

describe("episodeBadgeLabel (owner, 2026-11-08)", () => {
  it('is "E3" for episode 3, and null without a number', () => {
    const episode = slowHorses._embedded.episodes[2];
    expect(episodeBadgeLabel({ ...episode, number: 3 })).toBe("E3");
    expect(episodeBadgeLabel({ ...episode, number: null })).toBeNull();
  });
});
