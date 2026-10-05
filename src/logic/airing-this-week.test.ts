import onTheAir from "@/api/fixtures/tmdb-on-the-air.json";
import {
  airingThisWeek,
  byAiringDate,
  firstEpisodeDayThisWeek,
  isAiringType,
  weekDayWord,
} from "./airing-this-week";

const names = (ranking: ReturnType<typeof airingThisWeek>) =>
  ranking.map(({ recommendation }) => recommendation.name);

describe("airingThisWeek (FR-039)", () => {
  it("leaves out talk, news and reality before any TVmaze request, from a real TMDB page", () => {
    const shows = names(airingThisWeek(onTheAir.results));
    expect(shows).toContain("MobLand");
    expect(shows).toContain("Slow Horses");
    for (const left of [
      "Watch What Happens Live with Andy Cohen", // talk
      "The Daily Show", // news
      "Running Man", // reality
    ]) {
      expect(shows).not.toContain(left);
    }
  });

  it("orders by TMDB popularity, lists each show once, and keeps documentaries", () => {
    const ranking = airingThisWeek([
      { id: 1, name: "Low", popularity: 10, genre_ids: [18] },
      { id: 2, name: "High", popularity: 90, genre_ids: [18] },
      { id: 1, name: "Low", popularity: 10, genre_ids: [18] },
      { id: 3, name: "Doc", popularity: 50, genre_ids: [99] },
    ]);
    expect(names(ranking)).toEqual(["High", "Doc", "Low"]);
  });
});

describe("isAiringType (FR-039)", () => {
  it("keeps scripted shows, animation and documentaries", () => {
    for (const kept of ["Scripted", "Animation", "Documentary"]) {
      expect(isAiringType(kept)).toBe(true);
    }
  });

  it("leaves out reality, talk, news, game shows, sports and the rest", () => {
    for (const left of [
      "Reality",
      "Talk Show",
      "News",
      "Game Show",
      "Sports",
      "Variety",
      "Award Show",
      "Panel Show",
      null,
    ]) {
      expect(isAiringType(left)).toBe(false);
    }
  });
});

describe("firstEpisodeDayThisWeek (FR-039, CRI-110)", () => {
  // 2026-10-05 is a Monday; Stockholm is UTC+2.
  const TZ = "Europe/Stockholm";

  it("is the day of an episode in the hero's 7-day window", () => {
    expect(
      firstEpisodeDayThisWeek(
        [{ airstamp: "2026-10-09T01:00:00+00:00", number: 3 }],
        TZ,
        "2026-10-05",
      ),
    ).toBe("2026-10-09");
  });

  it("counts an episode that aired earlier today, as the hero does", () => {
    expect(
      firstEpisodeDayThisWeek(
        [
          { airstamp: "2026-10-05T06:00:00+00:00", number: 2 },
          { airstamp: "2026-10-12T06:00:00+00:00", number: 3 },
        ],
        TZ,
        "2026-10-05",
      ),
    ).toBe("2026-10-05");
  });

  it("is nothing for Family Guy, whose next episode is in February 2027", () => {
    expect(
      firstEpisodeDayThisWeek(
        [
          { airstamp: "2026-05-11T00:00:00+00:00", number: 20 },
          { airstamp: "2027-02-22T01:00:00+00:00", number: 1 },
        ],
        TZ,
        "2026-10-05",
      ),
    ).toBeNull();
  });

  it("leaves out specials and episodes without an airstamp", () => {
    expect(
      firstEpisodeDayThisWeek(
        [
          { airstamp: "2026-10-06T18:00:00+00:00", number: null },
          { airstamp: null, number: 4 },
        ],
        TZ,
        "2026-10-05",
      ),
    ).toBeNull();
  });
});

describe("weekDayWord (FR-039)", () => {
  // 2026-10-05 is a Monday.
  it("says Today, Tomorrow, then the weekday", () => {
    expect(weekDayWord("2026-10-05", "2026-10-05")).toBe("Today");
    expect(weekDayWord("2026-10-06", "2026-10-05")).toBe("Tomorrow");
    expect(weekDayWord("2026-10-09", "2026-10-05")).toBe("Fri");
    expect(weekDayWord("2026-10-11", "2026-10-05")).toBe("Sun");
  });

  it("is nothing outside the 7-day window", () => {
    expect(weekDayWord("2026-10-12", "2026-10-05")).toBeNull();
    expect(weekDayWord("2026-10-04", "2026-10-05")).toBeNull();
  });
});

// CRI-122: what airs today first, then tomorrow, then the weekdays.
describe("byAiringDate (FR-039, CRI-122)", () => {
  it("orders the cards by air date, today first", () => {
    const cards = [
      { name: "MobLand", date: "2026-10-09" },
      { name: "NCIS", date: "2026-10-07" },
      { name: "The Simpsons", date: "2026-10-05" },
      { name: "Silo", date: "2026-10-06" },
    ];
    expect(byAiringDate(cards).map((card) => card.name)).toEqual([
      "The Simpsons",
      "Silo",
      "NCIS",
      "MobLand",
    ]);
  });

  it("keeps popularity order within a day", () => {
    const cards = [
      { name: "Law & Order", date: "2026-10-09" },
      { name: "The Simpsons", date: "2026-10-05" },
      { name: "MobLand", date: "2026-10-09" },
    ];
    expect(byAiringDate(cards).map((card) => card.name)).toEqual([
      "The Simpsons",
      "Law & Order",
      "MobLand",
    ]);
  });

  it("leaves the cards it is given unchanged", () => {
    const cards = [
      { name: "MobLand", date: "2026-10-09" },
      { name: "The Simpsons", date: "2026-10-05" },
    ];
    byAiringDate(cards);
    expect(cards[0].name).toBe("MobLand");
  });
});
