import { isNextDay, localDateFromAirstamp, today } from "./local-date";
import type { TvMazeEpisode } from "@/api/tvmaze-types";
import showAKnightFixture from "@/api/fixtures/show-a-knight-of-the-seven-kingdoms.json";
import showTheBearFixture from "@/api/fixtures/show-the-bear.json";
import showSlowHorsesFixture from "@/api/fixtures/show-slow-horses.json";

// Pulls a single episode out of a show fixture's embedded episode list, so
// tests read real TVmaze data instead of hardcoded copies of it that could
// drift from the fixtures over time.
function findEpisode(
  fixture: unknown,
  season: number,
  number: number,
): TvMazeEpisode {
  const episodes = (fixture as { _embedded: { episodes: TvMazeEpisode[] } })
    ._embedded.episodes;
  const episode = episodes.find(
    (candidate) => candidate.season === season && candidate.number === number,
  );
  if (!episode) {
    throw new Error(`Fixture episode S${season}E${number} not found`);
  }
  return episode;
}

const knightS1E1 = findEpisode(showAKnightFixture, 1, 1);
const bearS5E1 = findEpisode(showTheBearFixture, 5, 1);
const slowHorsesS6E1 = findEpisode(showSlowHorsesFixture, 6, 1);

describe("localDateFromAirstamp (ADR 0001, ADR 0006)", () => {
  it("converts an HBO late-evening airstamp to the next Stockholm day (A Knight of the Seven Kingdoms S1E1)", () => {
    // airdate 2026-01-18, airtime 22:02 ET, airstamp 2026-01-19T03:02:00+00:00
    expect(localDateFromAirstamp(knightS1E1.airstamp, "Europe/Stockholm")).toBe(
      "2026-01-19",
    );
  });

  it("keeps a streaming release without a real airtime on the airstamp placeholder's Stockholm date (The Bear S5)", () => {
    // airdate 2026-06-25, airtime empty, airstamp 2026-06-25T16:00:00+00:00
    // TVmaze has no real airtime here, so the placeholder converts to the
    // same date as airdate (ADR 0006 documents this as a known limitation).
    expect(localDateFromAirstamp(bearS5E1.airstamp, "Europe/Stockholm")).toBe(
      "2026-06-25",
    );
  });

  it("matches the airdate for a streaming release with a midday placeholder (Slow Horses S6E1)", () => {
    expect(
      localDateFromAirstamp(slowHorsesS6E1.airstamp, "Europe/Stockholm"),
    ).toBe("2026-09-16");
  });

  it("gives different local dates for the same airstamp in different time zones", () => {
    const airstamp = bearS5E1.airstamp;
    expect(localDateFromAirstamp(airstamp, "America/New_York")).toBe(
      "2026-06-25",
    );
    expect(localDateFromAirstamp(airstamp, "Asia/Tokyo")).toBe("2026-06-26");
  });

  it("handles the Europe/Stockholm daylight saving change in October 2026", () => {
    // Synthetic boundary values, not tied to a fixture episode: this tests
    // the DST transition itself. 2026-10-25 01:00 UTC is the DST boundary
    // (CEST -> CET). Just before it, Stockholm is still one hour ahead.
    expect(
      localDateFromAirstamp("2026-10-24T23:30:00+00:00", "Europe/Stockholm"),
    ).toBe("2026-10-25");
    expect(
      localDateFromAirstamp("2026-10-24T21:30:00+00:00", "Europe/Stockholm"),
    ).toBe("2026-10-24");
  });

  it("handles the America/New_York daylight saving change in November 2026", () => {
    // Synthetic boundary value, not tied to a fixture episode.
    expect(
      localDateFromAirstamp("2026-11-01T05:30:00+00:00", "America/New_York"),
    ).toBe("2026-11-01");
  });
});

describe("today", () => {
  it("returns the local date for the given time zone from an injected clock", () => {
    const now = () => new Date("2026-06-25T23:30:00+00:00");
    expect(today("Europe/Stockholm", now)).toBe("2026-06-26");
    expect(today("America/New_York", now)).toBe("2026-06-25");
  });
});

describe("isNextDay", () => {
  it("is true for the calendar day immediately after today", () => {
    expect(isNextDay("2026-09-21", "2026-09-22")).toBe(true);
  });

  it("is true across a month boundary", () => {
    expect(isNextDay("2026-09-30", "2026-10-01")).toBe(true);
  });

  it("is false for today itself", () => {
    expect(isNextDay("2026-09-21", "2026-09-21")).toBe(false);
  });

  it("is false for two days ahead or more", () => {
    expect(isNextDay("2026-09-21", "2026-09-23")).toBe(false);
  });

  it("is false for a date before today", () => {
    expect(isNextDay("2026-09-21", "2026-09-20")).toBe(false);
  });
});
