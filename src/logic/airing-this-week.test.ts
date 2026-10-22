import onTheAir from "@/api/fixtures/tmdb-on-the-air.json";
import {
  airingByDay,
  airingThisWeek,
  airsOn,
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

// A show is on a day's part of the row only if TVmaze has an episode
// that day (CRI-110: as the hero would show it if followed).
describe("airsOn (FR-039, CRI-110)", () => {
  // 2026-10-05 is a Monday; Stockholm is UTC+2.
  const TZ = "Europe/Stockholm";

  it("is true on the day of an episode, in the user's time zone", () => {
    const episodes = [{ airstamp: "2026-10-08T23:00:00+00:00", number: 3 }];
    expect(airsOn(episodes, TZ, "2026-10-09")).toBe(true);
    expect(airsOn(episodes, TZ, "2026-10-08")).toBe(false);
  });

  it("counts an episode that aired earlier today, as the hero does", () => {
    expect(
      airsOn(
        [{ airstamp: "2026-10-05T06:00:00+00:00", number: 2 }],
        TZ,
        "2026-10-05",
      ),
    ).toBe(true);
  });

  it("is false for Family Guy, whose next episode is in February 2027", () => {
    expect(
      airsOn(
        [
          { airstamp: "2026-05-11T00:00:00+00:00", number: 20 },
          { airstamp: "2027-02-22T01:00:00+00:00", number: 1 },
        ],
        TZ,
        "2026-10-05",
      ),
    ).toBe(false);
  });

  it("leaves out specials and episodes without an airstamp", () => {
    expect(
      airsOn(
        [
          { airstamp: "2026-10-06T18:00:00+00:00", number: null },
          { airstamp: null, number: 4 },
        ],
        TZ,
        "2026-10-06",
      ),
    ).toBe(false);
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

// The row day by day (owner, 2026-10-22): today's shows first, the most
// popular first, then tomorrow's, and so on.
describe("airingByDay (FR-039, CRI-122)", () => {
  const show = (id: number, popularity: number) => ({
    id,
    name: `Show ${id}`,
    popularity,
    genre_ids: [18],
  });

  it("lists each day in turn, the most popular first within a day", () => {
    const { ranking, dayOf } = airingByDay([
      { day: "2026-10-05", results: [show(1, 10), show(2, 90)] },
      { day: "2026-10-06", results: [show(3, 99)] },
    ]);
    expect(names(ranking)).toEqual(["Show 2", "Show 1", "Show 3"]);
    expect(dayOf.get(1)).toBe("2026-10-05");
    expect(dayOf.get(3)).toBe("2026-10-06");
  });

  it("lists a show on several days once, on its first", () => {
    const { ranking, dayOf } = airingByDay([
      { day: "2026-10-05", results: [show(1, 10)] },
      { day: "2026-10-09", results: [show(1, 10), show(2, 20)] },
    ]);
    expect(names(ranking)).toEqual(["Show 1", "Show 2"]);
    expect(dayOf.get(1)).toBe("2026-10-05");
  });

  // Days are added as the row needs them: a place in the ranking never
  // moves when a later day is added.
  it("keeps every earlier place when a day is added", () => {
    const today = { day: "2026-10-05", results: [show(1, 10), show(2, 90)] };
    const before = names(airingByDay([today]).ranking);
    const after = names(
      airingByDay([today, { day: "2026-10-06", results: [show(3, 99)] }])
        .ranking,
    );
    expect(after.slice(0, before.length)).toEqual(before);
  });
});
