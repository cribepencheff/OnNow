import {
  deriveHomeViewState,
  earliestUpcomingEpisode,
  episodeCode,
  episodesLabel,
  homeCardMetaLine,
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

describe("earliestUpcomingEpisode (FR-006)", () => {
  it("returns null when no followed show has a known upcoming episode", () => {
    const result = earliestUpcomingEpisode([
      { showId: 1, next: { kind: "status", status: "Ended" } },
      {
        showId: 2,
        next: {
          kind: "announced-season",
          season: {
            id: 1,
            url: "",
            number: 2,
            name: "",
            episodeOrder: null,
            premiereDate: "2026-10-01",
            endDate: null,
            network: null,
            webChannel: null,
            image: null,
            summary: null,
          },
        },
      },
    ]);
    expect(result).toBeNull();
  });

  it("picks the show with the nearest upcoming episode across all followed shows", () => {
    const later = makeEpisode({ airstamp: "2026-10-01T20:00:00+00:00" });
    const sooner = makeEpisode({ airstamp: "2026-09-24T20:00:00+00:00" });

    const result = earliestUpcomingEpisode([
      { showId: 1, next: { kind: "episode", episode: later } },
      { showId: 2, next: { kind: "episode", episode: sooner } },
    ]);

    expect(result).toEqual({ showId: 2, episode: sooner });
  });
});

describe("upcomingDayLabel (FR-006, ADR 0001)", () => {
  it("labels the day after today as TOMORROW", () => {
    expect(upcomingDayLabel("2026-09-22", "2026-09-21")).toBe("TOMORROW");
  });

  it("labels a day across a month boundary as TOMORROW when it is the next day", () => {
    expect(upcomingDayLabel("2026-10-01", "2026-09-30")).toBe("TOMORROW");
  });

  it("labels any other day with its weekday, day and month, never a time", () => {
    expect(upcomingDayLabel("2026-09-26", "2026-09-21")).toBe("Sat 26 Sep");
  });
});

describe("deriveHomeViewState", () => {
  const baseInput = {
    followedCount: 1,
    isLoading: false,
    isError: false,
    showsWithEpisodeToday: [],
    nextByShow: [],
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

  it("shows the next upcoming episode when today is empty (FR-006)", () => {
    const episode = makeEpisode({ airstamp: "2026-09-24T20:00:00+00:00" });
    const state = deriveHomeViewState({
      ...baseInput,
      nextByShow: [{ showId: 7, next: { kind: "episode", episode } }],
    });
    expect(state).toEqual({ kind: "next-episode", showId: 7, episode });
  });

  it("shows the empty follow list state when nothing is followed (backlog CRI-66, PRD FR-013)", () => {
    const state = deriveHomeViewState({ ...baseInput, followedCount: 0 });
    expect(state).toEqual({ kind: "empty-follow-list" });
  });

  it("shows a quiet no-upcoming state when followed shows exist but none has a known upcoming episode", () => {
    const state = deriveHomeViewState({
      ...baseInput,
      followedCount: 2,
      nextByShow: [
        { showId: 1, next: { kind: "status", status: "Ended" } },
        { showId: 2, next: { kind: "status", status: "To Be Determined" } },
      ],
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
