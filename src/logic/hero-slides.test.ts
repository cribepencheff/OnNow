// One hero slide per show for the week, with the episode range as its date
// line (CRI-94, FR-012, FR-031). 2026-10-04 is a Sunday.

import type { TvMazeEpisode, TvMazeShow } from "@/api/tvmaze-types";
import {
  findHeroSlides,
  heroDateRange,
  heroEpisodeRange,
  heroPillLabel,
} from "./hero-carousel";

const TZ = "Europe/Stockholm";

function show(id: number): TvMazeShow {
  return { id, name: `Show ${id}` } as TvMazeShow;
}

// Noon UTC keeps the local date the same in Stockholm.
function ep(date: string, season: number, number: number): TvMazeEpisode {
  return {
    id: season * 1000 + number,
    season,
    number,
    name: `Episode ${number}`,
    airstamp: `${date}T12:00:00+00:00`,
  } as TvMazeEpisode;
}

const daily = [
  ep("2026-10-05", 23, 156),
  ep("2026-10-06", 23, 157),
  ep("2026-10-07", 23, 158),
];

function lineFor(
  episodes: TvMazeEpisode[],
  todayDate: string,
): string | undefined {
  const [slide] = findHeroSlides([{ show: show(1), episodes }], TZ, todayDate);
  return (
    slide &&
    `${heroPillLabel(slide, todayDate)} / ${heroEpisodeRange(slide.episodes)}`
  );
}

describe("findHeroSlides: one slide per show (CRI-94)", () => {
  it("gives a single episode its own slide", () => {
    expect(lineFor([ep("2026-10-09", 2, 4)], "2026-10-04")).toBe(
      "Fri 9 Oct / S2E4",
    );
  });

  it("groups a show's episodes in the window into one slide with a range", () => {
    const slides = findHeroSlides(
      [{ show: show(1), episodes: daily }],
      TZ,
      "2026-10-04",
    );
    expect(slides).toHaveLength(1);
    expect(slides[0].episodes).toHaveLength(3);
    // Seen from two days before, so the range starts neither today nor tomorrow.
    expect(heroPillLabel(slides[0], "2026-10-03")).toBe("Mon–Wed · 5–7 Oct");
  });

  it('is still one slide when the first episode is tomorrow, and reads "Tomorrow–Wed · 5–7 Oct"', () => {
    expect(lineFor(daily, "2026-10-04")).toBe(
      "Tomorrow–Wed · 5–7 Oct / S23E156–158",
    );
  });

  it('reads "Today–Thu · 5–8 Oct" when today is in the range', () => {
    const run = [...daily, ep("2026-10-08", 23, 159)];
    expect(lineFor(run, "2026-10-05")).toBe(
      "Today–Thu · 5–8 Oct / S23E156–159",
    );
  });

  it("starts the range from today as days pass", () => {
    expect(lineFor(daily, "2026-10-06")).toBe(
      "Today–Wed · 6–7 Oct / S23E157–158",
    );
    expect(lineFor(daily, "2026-10-07")).toBe("Today · Wed 7 Oct / S23E158");
    expect(lineFor(daily, "2026-10-08")).toBeUndefined();
  });

  it("spans a season boundary", () => {
    expect(
      lineFor([ep("2026-10-05", 1, 10), ep("2026-10-07", 2, 1)], "2026-10-04"),
    ).toBe("Tomorrow–Wed · 5–7 Oct / S1E10–S2E1");
  });

  it("leaves out episodes beyond the 7-day window", () => {
    expect(
      lineFor([ep("2026-10-05", 1, 1), ep("2026-10-11", 1, 2)], "2026-10-04"),
    ).toBe("Tomorrow · Mon 5 Oct / S1E1");
  });

  it("counts slides, not episodes: one per show, in date order", () => {
    const slides = findHeroSlides(
      [
        { show: show(1), episodes: daily },
        { show: show(2), episodes: [ep("2026-10-04", 1, 1)] },
      ],
      TZ,
      "2026-10-04",
    );
    expect(slides.map((slide) => slide.show.id)).toEqual([2, 1]);
  });
});

describe("heroDateRange (CRI-94)", () => {
  it("is one date for a single day", () => {
    expect(heroDateRange("2026-10-09", "2026-10-09", "2026-10-04")).toBe(
      "Fri 9 Oct",
    );
  });

  it("names both months across a month boundary", () => {
    expect(heroDateRange("2026-09-30", "2026-10-02", "2026-09-28")).toBe(
      "30 Sep–2 Oct",
    );
  });

  it("adds the year when the range ends in another year", () => {
    expect(heroDateRange("2026-12-30", "2027-01-02", "2026-12-28")).toBe(
      "30 Dec–2 Jan 2027",
    );
  });
});

describe("heroEpisodeRange (CRI-94)", () => {
  it("is one code for one episode, and a range within a season", () => {
    expect(heroEpisodeRange([ep("2026-10-05", 2, 4)])).toBe("S2E4");
    expect(
      heroEpisodeRange([ep("2026-10-05", 3, 1), ep("2026-10-05", 3, 8)]),
    ).toBe("S3E1–8");
  });
});
