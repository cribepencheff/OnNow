// The hero's date pill and episode line (FR-031, ADR 0015, CRI-124) and its
// "Open in" slot, which falls back like Show detail when the TMDB lookup fails.

import type { TvMazeEpisode, TvMazeShow } from "@/api/tvmaze-types";
import {
  heroAvailability,
  heroEpisodeLine,
  heroEpisodeTitle,
  heroPillLabel,
} from "./hero-carousel";
import { NOT_ON_TMDB } from "./streaming-service";

const paramount = {
  id: 1,
  name: "MobLand",
  network: null,
  webChannel: { name: "Paramount+" },
} as unknown as TvMazeShow;

const episode = {
  season: 2,
  number: 4,
  name: "Blank Curtain",
} as TvMazeEpisode;

function slide(localDate: string, endDate = localDate) {
  return { show: paramount, episodes: [episode], localDate, endDate };
}

// 2026-10-04 is a Sunday.
describe("heroPillLabel (FR-031, ADR 0015, CRI-124)", () => {
  it('reads "Today" and the date on today\'s slide, in sentence case', () => {
    expect(heroPillLabel(slide("2026-10-04"), "2026-10-04")).toBe(
      "Today · Sun 4 Oct",
    );
  });

  it('reads "Tomorrow" and the date on tomorrow\'s slide', () => {
    expect(heroPillLabel(slide("2026-10-05"), "2026-10-04")).toBe(
      "Tomorrow · Mon 5 Oct",
    );
  });

  it("is the date alone further ahead, with no verb and no network", () => {
    expect(heroPillLabel(slide("2026-10-09"), "2026-10-04")).toBe("Fri 9 Oct");
  });

  it("names the days and the dates of a range", () => {
    expect(heroPillLabel(slide("2026-10-09", "2026-10-15"), "2026-10-09")).toBe(
      "Today–Thu · 9–15 Oct",
    );
    expect(heroPillLabel(slide("2026-10-07", "2026-10-09"), "2026-10-04")).toBe(
      "Wed–Fri · 7–9 Oct",
    );
  });

  it("adds the year when the range ends in another year", () => {
    expect(heroPillLabel(slide("2026-12-30", "2027-01-02"), "2026-12-29")).toBe(
      "Tomorrow–Sat · 30 Dec–2 Jan 2027",
    );
  });
});

describe("heroEpisodeLine (CRI-124)", () => {
  it("is the code and the title on one line", () => {
    expect(heroEpisodeLine([episode])).toBe("S2E4 · Blank Curtain");
  });

  it("gives the count when several episodes have no title", () => {
    expect(
      heroEpisodeLine([
        { ...episode, name: "TBA" },
        { ...episode, number: 5, name: "TBA" },
      ]),
    ).toBe("S2E4–5 · 2 episodes");
  });
});

describe("heroEpisodeTitle (CRI-94)", () => {
  it("is the title of a single episode", () => {
    expect(heroEpisodeTitle([episode])).toBe("Blank Curtain");
  });

  it('is "Title not announced" for a single episode with a placeholder or no title', () => {
    for (const name of ["Episode 9", "TBA", ""]) {
      expect(heroEpisodeTitle([{ ...episode, name }])).toBe(
        "Title not announced",
      );
    }
  });

  it("is the first episode's title on a slide with several", () => {
    expect(
      heroEpisodeTitle([episode, { ...episode, number: 5, name: "Next" }]),
    ).toBe("Blank Curtain");
  });

  it('is the episode count when the first title is a placeholder ("Episode 9", "TBA")', () => {
    const second = { ...episode, number: 10, name: "Episode 10" };
    expect(heroEpisodeTitle([{ ...episode, name: "Episode 9" }, second])).toBe(
      "2 episodes",
    );
    expect(heroEpisodeTitle([{ ...episode, name: "TBA" }, second])).toBe(
      "2 episodes",
    );
    expect(heroEpisodeTitle([{ ...episode, name: "" }, second])).toBe(
      "2 episodes",
    );
  });
});

describe("heroAvailability (FR-014, FR-029)", () => {
  const netflixSite = "https://www.netflix.com/title/80057281";

  it("shows nothing when the lookup fails or there is no key, not TVmaze's link (CRI-106)", () => {
    expect(heroAvailability(undefined, false, true, netflixSite, "SE")).toEqual(
      { kind: "none" },
    );
    expect(heroAvailability(null, false, false, netflixSite, "SE")).toEqual({
      kind: "none",
    });
  });

  it("shows nothing when TMDB does not know the show, not TVmaze's link (CRI-102)", () => {
    expect(
      heroAvailability(NOT_ON_TMDB, false, false, netflixSite, "SE"),
    ).toEqual({ kind: "none" });
  });

  it("holds the slot while the lookup runs", () => {
    expect(heroAvailability(undefined, true, false, null, "SE")).toEqual({
      kind: "loading",
    });
  });

  it("is a full button when the show has a service in the region", () => {
    expect(
      heroAvailability(
        [{ providerId: 8, providerName: "Netflix" }],
        false,
        false,
        netflixSite,
        "SE",
      ),
    ).toEqual({
      kind: "button",
      link: expect.objectContaining({ service: "Netflix" }),
    });
  });
});
