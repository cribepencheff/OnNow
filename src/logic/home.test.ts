import {
  deriveHomeViewState,
  episodeCode,
  episodesLabel,
  findNextDayWithEpisodes,
  homeCardMetaLine,
  nextDayCountLabel,
  todayCountLabel,
  upcomingDayLabel,
} from "./home";
import type { TvMazeEpisode, TvMazeShow } from "@/api/tvmaze-types";

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
    network: { id: 1, name: "AMC", country: null, officialSite: null },
    webChannel: null,
    image: null,
    summary: null,
    _links: { self: { href: "https://api.tvmaze.com/shows/1" } },
    ...overrides,
  };
}

function makeEpisode(overrides: Partial<TvMazeEpisode> = {}): TvMazeEpisode {
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

describe("episodeCode", () => {
  it("formats season and episode number", () => {
    expect(episodeCode(makeEpisode({ season: 2, number: 5 }))).toBe("S2E5");
  });
});

describe("episodesLabel (FR-012)", () => {
  it("formats a single episode as its code", () => {
    expect(episodesLabel([makeEpisode({ season: 3, number: 4 })])).toBe("S3E4");
  });

  it("collapses several episodes of one show on the same day into a range", () => {
    const episodes = [1, 2, 3, 4, 5, 6, 7, 8].map((number) =>
      makeEpisode({ number }),
    );
    expect(episodesLabel(episodes)).toBe("Episodes 1–8");
  });
});

describe("homeCardMetaLine", () => {
  it("combines the episode code with the network", () => {
    const show = makeShow({
      network: { id: 1, name: "AMC", country: null, officialSite: null },
    });
    expect(
      homeCardMetaLine(show, [makeEpisode({ season: 1, number: 2 })]),
    ).toBe("S1E2 · AMC");
  });

  it("omits the network when the show has none", () => {
    const show = makeShow({ network: null, webChannel: null });
    expect(
      homeCardMetaLine(show, [makeEpisode({ season: 1, number: 2 })]),
    ).toBe("S1E2");
  });
});

describe("todayCountLabel (FR-005)", () => {
  it("formats a 1-based position out of the total", () => {
    expect(todayCountLabel(0, 3)).toBe("NEW TODAY · 1/3");
    expect(todayCountLabel(2, 3)).toBe("NEW TODAY · 3/3");
  });
});

describe("findNextDayWithEpisodes (FR-006, FR-012, FR-037)", () => {
  const todayDate = "2026-09-21";

  it("returns null when no followed show has an episode after today", () => {
    const show = makeShow();
    const episode = makeEpisode({ airstamp: "2026-09-21T18:00:00+00:00" }); // today, not after
    const result = findNextDayWithEpisodes(
      [{ show, episodes: [episode] }],
      "UTC",
      todayDate,
    );
    expect(result).toBeNull();
  });

  it("gives one show on the next day one card, position 1 of 1", () => {
    const show = makeShow({ name: "Silo" });
    const episode = makeEpisode({ airstamp: "2026-09-22T18:00:00+00:00" });

    const result = findNextDayWithEpisodes(
      [{ show, episodes: [episode] }],
      "UTC",
      todayDate,
    );

    expect(result).toEqual({
      localDate: "2026-09-22",
      shows: [{ show, episodes: [episode] }],
    });
  });

  it("gives two shows releasing the same next day two cards", () => {
    const showA = makeShow({ id: 1, name: "Slow Horses" });
    const showB = makeShow({ id: 2, name: "Silo" });
    const episodeA = makeEpisode({ airstamp: "2026-09-22T18:00:00+00:00" });
    const episodeB = makeEpisode({ airstamp: "2026-09-22T20:00:00+00:00" });

    const result = findNextDayWithEpisodes(
      [
        { show: showA, episodes: [episodeA] },
        { show: showB, episodes: [episodeB] },
      ],
      "UTC",
      todayDate,
    );

    expect(result?.localDate).toBe("2026-09-22");
    expect(result?.shows).toEqual([
      { show: showA, episodes: [episodeA] },
      { show: showB, episodes: [episodeB] },
    ]);
  });

  it("picks the nearest day with episodes, ignoring a later one, one day only", () => {
    const showSoon = makeShow({ id: 1, name: "Soon" });
    const showLater = makeShow({ id: 2, name: "Later" });
    const episodeSoon = makeEpisode({ airstamp: "2026-09-22T18:00:00+00:00" });
    const episodeLater = makeEpisode({
      airstamp: "2026-09-26T18:00:00+00:00",
    });

    const result = findNextDayWithEpisodes(
      [
        { show: showSoon, episodes: [episodeSoon] },
        { show: showLater, episodes: [episodeLater] },
      ],
      "UTC",
      todayDate,
    );

    expect(result?.localDate).toBe("2026-09-22");
    expect(result?.shows).toEqual([
      { show: showSoon, episodes: [episodeSoon] },
    ]);
  });

  it("groups several episodes of one show on that day into one card (FR-012)", () => {
    const show = makeShow({ name: "The Bear" });
    const episodes = [1, 2, 3].map((number) =>
      makeEpisode({ number, airstamp: "2026-09-22T18:00:00+00:00" }),
    );

    const result = findNextDayWithEpisodes(
      [{ show, episodes }],
      "UTC",
      todayDate,
    );

    expect(result?.shows).toHaveLength(1);
    expect(result?.shows[0].episodes).toHaveLength(3);
  });
});

describe("upcomingDayLabel (FR-006, ADR 0001)", () => {
  it("labels the day after today as TOMORROW", () => {
    expect(upcomingDayLabel("2026-09-22", "2026-09-21")).toBe("TOMORROW");
  });

  it("labels a day across a month boundary as TOMORROW when it is the next day", () => {
    expect(upcomingDayLabel("2026-10-01", "2026-09-30")).toBe("TOMORROW");
  });

  it("labels any other day with its weekday, day and month in upper case, never a time", () => {
    expect(upcomingDayLabel("2026-09-26", "2026-09-21")).toBe("SAT 26 SEP");
  });
});

describe("nextDayCountLabel (FR-005 style badge, FR-006)", () => {
  it("formats TOMORROW with a 1-based position, for example one show on the next day", () => {
    expect(nextDayCountLabel("2026-09-22", "2026-09-21", 0, 1)).toBe(
      "TOMORROW · 1/1",
    );
  });

  it("formats TOMORROW with the position for several shows the same day", () => {
    expect(nextDayCountLabel("2026-09-22", "2026-09-21", 1, 2)).toBe(
      "TOMORROW · 2/2",
    );
  });

  it("formats a day further away as a date, not TOMORROW", () => {
    expect(nextDayCountLabel("2026-09-24", "2026-09-21", 0, 1)).toBe(
      "THU 24 SEP · 1/1",
    );
  });
});

describe("deriveHomeViewState", () => {
  const baseInput = {
    followedCount: 1,
    isLoading: false,
    isError: false,
    showsWithEpisodeToday: [],
    nextDayEpisodes: null,
  };

  it("shows today's shows when at least one has an episode today (FR-004)", () => {
    const show = makeShow();
    const episodes = [makeEpisode()];
    const state = deriveHomeViewState({
      ...baseInput,
      showsWithEpisodeToday: [{ show, episodes }],
    });
    expect(state).toEqual({
      kind: "today",
      shows: [{ show, episodes }],
    });
  });

  it("shows the next day's episodes when today is empty (FR-006)", () => {
    const show = makeShow();
    const episodes = [makeEpisode({ airstamp: "2026-09-24T20:00:00+00:00" })];
    const state = deriveHomeViewState({
      ...baseInput,
      nextDayEpisodes: {
        localDate: "2026-09-24",
        shows: [{ show, episodes }],
      },
    });
    expect(state).toEqual({
      kind: "next-day",
      localDate: "2026-09-24",
      shows: [{ show, episodes }],
    });
  });

  it("shows the empty follow list state when nothing is followed (backlog CRI-66, PRD FR-013)", () => {
    const state = deriveHomeViewState({ ...baseInput, followedCount: 0 });
    expect(state).toEqual({ kind: "empty-follow-list" });
  });

  it("shows a quiet no-upcoming state when followed shows exist but none has a known upcoming episode", () => {
    const state = deriveHomeViewState({
      ...baseInput,
      followedCount: 2,
      nextDayEpisodes: null,
    });
    expect(state).toEqual({ kind: "no-upcoming" });
  });

  it("shows a loading state while nothing has loaded yet (NFR-001)", () => {
    const state = deriveHomeViewState({
      ...baseInput,
      followedCount: 1,
      isLoading: true,
    });
    expect(state).toEqual({ kind: "loading" });
  });

  it("shows a quiet error state when nothing loaded and the fetch failed, never inventing data (NFR-002)", () => {
    const state = deriveHomeViewState({
      ...baseInput,
      followedCount: 1,
      isError: true,
    });
    expect(state).toEqual({ kind: "error" });
  });

  it("prefers cached today data over a failed background refetch", () => {
    const show = makeShow();
    const episodes = [makeEpisode()];
    const state = deriveHomeViewState({
      ...baseInput,
      isError: true,
      showsWithEpisodeToday: [{ show, episodes }],
    });
    expect(state.kind).toBe("today");
  });
});
