import {
  addMonths,
  calendarDayCell,
  calendarRowLine,
  datesWithEpisodes,
  fullDateLabel,
  monthGridDates,
  monthGridWeeks,
  monthOf,
  monthTitle,
} from "./calendar";
import type { TvMazeEpisode } from "@/api/tvmaze-types";
import showAKnightFixture from "@/api/fixtures/show-a-knight-of-the-seven-kingdoms.json";

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

describe("monthTitle (PRD 5.2)", () => {
  it('formats "September 2026"', () => {
    expect(monthTitle(2026, 9)).toBe("September 2026");
  });
});

describe("addMonths", () => {
  it("moves forward within a year", () => {
    expect(addMonths({ year: 2026, month: 9 }, 1)).toEqual({
      year: 2026,
      month: 10,
    });
  });

  it("moves forward across a year boundary", () => {
    expect(addMonths({ year: 2026, month: 12 }, 1)).toEqual({
      year: 2027,
      month: 1,
    });
  });

  it("moves backward across a year boundary", () => {
    expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({
      year: 2025,
      month: 12,
    });
  });
});

describe("monthOf", () => {
  it("parses year and month from a local date", () => {
    expect(monthOf("2026-09-24")).toEqual({ year: 2026, month: 9 });
  });
});

describe("fullDateLabel", () => {
  it('formats "September 21, 2026"', () => {
    expect(fullDateLabel("2026-09-21")).toBe("September 21, 2026");
  });
});

describe("monthGridDates (PRD 5.2, 5.7: week start follows the locale)", () => {
  it("pads leading blanks so Monday-start weeks align September 2026 correctly", () => {
    // 2026-09-01 is a Tuesday. Monday start: 1 leading blank, then 1..30.
    const dates = monthGridDates({ year: 2026, month: 9 }, 1);
    expect(dates[0]).toBeNull();
    expect(dates[1]).toBe("2026-09-01");
    expect(dates[30]).toBe("2026-09-30");
  });

  it("pads leading blanks so Sunday-start weeks align September 2026 correctly", () => {
    // 2026-09-01 is a Tuesday. Sunday start: 2 leading blanks, then 1..30.
    const dates = monthGridDates({ year: 2026, month: 9 }, 0);
    expect(dates[0]).toBeNull();
    expect(dates[1]).toBeNull();
    expect(dates[2]).toBe("2026-09-01");
    expect(dates[31]).toBe("2026-09-30");
  });

  it("always returns 6 full weeks (42 cells), so every month is the same height", () => {
    expect(monthGridDates({ year: 2026, month: 9 }, 1)).toHaveLength(42);
    expect(monthGridDates({ year: 2026, month: 2 }, 1)).toHaveLength(42);
  });
});

// Regression: the grid must be laid out as explicit rows of exactly seven
// cells, never a single wrapping list, so cell width and margin rounding can
// never shift a day into the wrong weekday column. This tests row
// structure, not pixel positions: RNTL does not compute layout, so a
// wrapping-list bug like this one is invisible to a component test that
// only checks text and labels are present, not which row they're in.
describe("monthGridWeeks (PRD 5.2, 5.7: week start follows the locale)", () => {
  it("returns six week rows of exactly seven cells for Monday-start September 2026", () => {
    const weeks = monthGridWeeks({ year: 2026, month: 9 }, 1);

    expect(weeks).toHaveLength(6);
    for (const week of weeks) {
      expect(week).toHaveLength(7);
    }
  });

  it("puts September 1 under Tuesday and September 6 under Sunday, in the same row, for Monday-start weeks", () => {
    const weeks = monthGridWeeks({ year: 2026, month: 9 }, 1);

    // Monday-start columns: Mon, Tue, Wed, Thu, Fri, Sat, Sun.
    expect(weeks[0][1]).toBe("2026-09-01");
    expect(weeks[0][6]).toBe("2026-09-06");
  });

  it("returns six week rows of exactly seven cells for Sunday-start September 2026", () => {
    const weeks = monthGridWeeks({ year: 2026, month: 9 }, 0);

    expect(weeks).toHaveLength(6);
    for (const week of weeks) {
      expect(week).toHaveLength(7);
    }
  });

  it("puts September 1 under Tuesday for Sunday-start weeks", () => {
    const weeks = monthGridWeeks({ year: 2026, month: 9 }, 0);

    // Sunday-start columns: Sun, Mon, Tue, Wed, Thu, Fri, Sat.
    expect(weeks[0][2]).toBe("2026-09-01");
  });
});

describe("datesWithEpisodes (FR-008, FR-037)", () => {
  it("collects the local dates of every followed show's episodes", () => {
    const episodeA = makeEpisode({ airstamp: "2026-09-24T18:00:00+00:00" });
    const episodeB = makeEpisode({ airstamp: "2026-09-26T20:00:00+00:00" });

    const dates = datesWithEpisodes(
      [{ episodes: [episodeA, episodeB] }],
      "UTC",
    );

    expect(dates).toEqual(new Set(["2026-09-24", "2026-09-26"]));
  });

  it("lands an HBO late-evening episode on the right local day in Europe/Stockholm", () => {
    const episodes = (
      showAKnightFixture as unknown as {
        _embedded: { episodes: TvMazeEpisode[] };
      }
    )._embedded.episodes;
    const episode = episodes.find((e) => e.season === 1 && e.number === 1)!;

    const dates = datesWithEpisodes(
      [{ episodes: [episode] }],
      "Europe/Stockholm",
    );

    // S1E1: airdate 2026-01-18 (network time zone), airstamp lands on
    // 2026-01-19 in Stockholm (ADR 0006).
    expect(dates).toEqual(new Set(["2026-01-19"]));
  });

  it("lands the same episode on the previous local day in America/New_York", () => {
    const episodes = (
      showAKnightFixture as unknown as {
        _embedded: { episodes: TvMazeEpisode[] };
      }
    )._embedded.episodes;
    const episode = episodes.find((e) => e.season === 1 && e.number === 1)!;

    const dates = datesWithEpisodes(
      [{ episodes: [episode] }],
      "America/New_York",
    );

    expect(dates).toEqual(new Set(["2026-01-18"]));
  });
});

describe("calendarRowLine (PRD 5.2, FR-012)", () => {
  it("formats a single episode with its code and title", () => {
    const episode = makeEpisode({
      season: 2,
      number: 3,
      name: "Winter Light",
    });
    expect(calendarRowLine([episode])).toBe("S2E3 · Winter Light");
  });

  it("collapses several episodes of one show on the same day into a range", () => {
    const episodes = [1, 2, 3, 4, 5, 6, 7, 8].map((number) =>
      makeEpisode({ number }),
    );
    expect(calendarRowLine(episodes)).toBe("Episodes 1–8");
  });
});

describe("calendarDayCell (FR-008)", () => {
  const dates = new Set(["2026-09-24"]);

  it("marks a day with episodes", () => {
    expect(
      calendarDayCell("2026-09-24", "2026-09-21", "2026-09-21", dates)
        .hasEpisodes,
    ).toBe(true);
  });

  it("does not mark a day without episodes", () => {
    expect(
      calendarDayCell("2026-09-25", "2026-09-21", "2026-09-21", dates)
        .hasEpisodes,
    ).toBe(false);
  });

  it("flags today", () => {
    expect(
      calendarDayCell("2026-09-21", "2026-09-21", "2026-09-21", dates).isToday,
    ).toBe(true);
    expect(
      calendarDayCell("2026-09-22", "2026-09-21", "2026-09-21", dates).isToday,
    ).toBe(false);
  });

  it("flags the selected day", () => {
    expect(
      calendarDayCell("2026-09-24", "2026-09-21", "2026-09-24", dates)
        .isSelected,
    ).toBe(true);
    expect(
      calendarDayCell("2026-09-21", "2026-09-21", "2026-09-24", dates)
        .isSelected,
    ).toBe(false);
  });
});
