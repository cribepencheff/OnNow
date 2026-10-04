import onTheAir from "@/api/fixtures/tmdb-on-the-air.json";
import { airingThisWeek, weekDayWord } from "./airing-this-week";

const names = (ranking: ReturnType<typeof airingThisWeek>) =>
  ranking.map(({ recommendation }) => recommendation.name);

describe("airingThisWeek (FR-039)", () => {
  it("keeps scripted shows only, from a real TMDB on-the-air page", () => {
    const shows = names(airingThisWeek(onTheAir.results));
    expect(shows).toContain("MobLand");
    expect(shows).toContain("Slow Horses");
    for (const unscripted of [
      "Watch What Happens Live with Andy Cohen", // talk
      "The Daily Show", // news
      "Running Man", // reality
      "Goede Tijden, Slechte Tijden", // soap
    ]) {
      expect(shows).not.toContain(unscripted);
    }
  });

  it("orders by TMDB popularity and lists each show once", () => {
    const ranking = airingThisWeek([
      { id: 1, name: "Low", popularity: 10, genre_ids: [18] },
      { id: 2, name: "High", popularity: 90, genre_ids: [18] },
      { id: 1, name: "Low", popularity: 10, genre_ids: [18] },
      { id: 3, name: "Doc", popularity: 99, genre_ids: [99] },
    ]);
    expect(names(ranking)).toEqual(["High", "Low"]);
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
