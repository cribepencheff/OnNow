import {
  allEpisodesAvailable,
  currentSeasonNumber,
  episodeDateLabel,
  episodeOfLabel,
  episodeState,
  isFinale,
  latestCard,
  latestEpisode,
  nextCard,
  regularEpisodes,
  relativeDayLabel,
  seasonTabs,
  showDetailMetaLine,
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

function nextCardFor(show: TvMazeShowWithEmbeds, todayDate = TODAY) {
  return nextCard(
    show,
    show._embedded.episodes,
    show._embedded.seasons,
    TZ,
    todayDate,
  );
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
  it("shows year, status and network", () => {
    expect(showDetailMetaLine(slowHorses)).toBe("2022 · Running · Apple TV");
    expect(showDetailMetaLine(killingEve)).toBe("2018 · Ended · AMC+");
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

describe("nextCard (FR-028, FR-034)", () => {
  it("is the next regular episode after today for a running show", () => {
    expect(nextCardFor(slowHorses)).toEqual({
      kind: "episode",
      episode: find(slowHorses, 6, 3),
    });
  });

  it("is a season premiere card with the date between seasons, using the CRI-78 label", () => {
    expect(nextCardFor(silo)).toEqual({
      kind: "season-premiere",
      label: "Season 4 premiere · Fri 9 Jul 2027",
    });
  });

  it("is a season premiere card for an announced season with a date and no episodes", () => {
    const seasons: TvMazeSeason[] = [
      ...foundation._embedded.seasons.slice(0, 3),
      { ...foundation._embedded.seasons[3], premiereDate: "2026-11-20" },
    ];
    expect(
      nextCard(foundation, foundation._embedded.episodes, seasons, TZ, TODAY),
    ).toEqual({
      kind: "season-premiere",
      label: "Season 4 premiere · Fri 20 Nov",
    });
  });

  it("is the status from TVmaze between seasons without a date (data first)", () => {
    expect(nextCardFor(foundation)).toEqual({
      kind: "status",
      status: "Running",
    });
  });

  it("is the status from TVmaze for an ended show", () => {
    expect(nextCardFor(killingEve)).toEqual({
      kind: "status",
      status: "Ended",
    });
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

// CRI-81: whole-season releases ("drops") and plain status wording.
describe("season drops (FR-012, FR-028, FR-034, CRI-81)", () => {
  const neagley = showNeagleyFixture as unknown as TvMazeShowWithEmbeds;
  const diplomat = showTheDiplomatFixture as unknown as TvMazeShowWithEmbeds;

  function latestCardFor(show: TvMazeShowWithEmbeds, todayDate = TODAY) {
    return latestCard(
      show._embedded.episodes,
      show._embedded.seasons,
      TZ,
      todayDate,
    );
  }

  it("shows Neagley's 8 same-day episodes as one latest item, with all when the count matches the episode order", () => {
    expect(latestCardFor(neagley)).toEqual({
      kind: "drop",
      label: "Season 1 · all 8 episodes · 7 days ago",
    });
    expect(latestCardFor(neagley, "2026-09-16")).toEqual({
      kind: "drop",
      label: "Season 1 · all 8 episodes · Today",
    });
  });

  it('says "N episodes" without "all" when the count does not match the episode order', () => {
    const firstThree = neagley._embedded.episodes.filter(
      (episode) => (episode.number ?? 0) <= 3,
    );
    expect(
      latestCard(firstThree, neagley._embedded.seasons, TZ, TODAY),
    ).toEqual({ kind: "drop", label: "Season 1 · 3 episodes · 7 days ago" });
  });

  it("shows The Diplomat's season 3 drop as the latest item, with the year", () => {
    expect(latestCardFor(diplomat)).toEqual({
      kind: "drop",
      label: "Season 3 · all 8 episodes · Thu 16 Oct 2025",
    });
  });

  it("keeps a weekly show's latest episode as an episode card", () => {
    expect(latestCardFor(slowHorses)).toEqual({
      kind: "episode",
      episode: find(slowHorses, 6, 2),
    });
  });

  it("shows The Diplomat's next season premiere, a single listed episode, as before", () => {
    expect(nextCardFor(diplomat)).toEqual({
      kind: "season-premiere",
      label: "Season 4 premiere · Thu 15 Oct",
    });
  });

  it("shows an upcoming drop as one next item, as a premiere when it starts the season", () => {
    expect(nextCardFor(diplomat, "2025-10-10")).toEqual({
      kind: "drop",
      label: "Season 3 premiere · all 8 episodes · In 6 days",
    });
  });

  it("shows the status in plain words on the next card (TVmaze: To Be Determined)", () => {
    expect(nextCardFor(neagley)).toEqual({
      kind: "status",
      status: "Renewal not announced",
    });
  });

  it("uses plain status words in the meta line", () => {
    expect(showDetailMetaLine(neagley)).toBe(
      "2026 · Renewal not announced · Prime Video",
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
