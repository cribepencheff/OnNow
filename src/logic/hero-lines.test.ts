// The hero's date and title lines (FR-031, ADR 0015) and its "Open in"
// slot, which falls back like Show detail when the TMDB lookup fails.

import type { TvMazeEpisode, TvMazeShow } from "@/api/tvmaze-types";
import {
  heroAvailability,
  heroDateLine,
  heroEpisodeTitle,
} from "./hero-carousel";

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

describe("heroDateLine (FR-031, ADR 0015)", () => {
  it("is the date and the code, with no verb and no network", () => {
    expect(
      heroDateLine(
        {
          show: paramount,
          episodes: [episode],
          localDate: "2026-10-09",
          endDate: "2026-10-09",
        },
        "2026-10-04",
      ),
    ).toBe("Fri 9 Oct · S2E4");
  });

  it("uses the date on today's slide too; the badge says TODAY", () => {
    expect(
      heroDateLine(
        {
          show: paramount,
          episodes: [episode],
          localDate: "2026-10-04",
          endDate: "2026-10-04",
        },
        "2026-10-04",
      ),
    ).toBe("Sun 4 Oct · S2E4");
  });
});

describe("heroEpisodeTitle", () => {
  it("is the title of a single episode", () => {
    expect(heroEpisodeTitle([episode])).toBe("Blank Curtain");
  });

  it("is null without a title, or for several episodes", () => {
    expect(heroEpisodeTitle([{ ...episode, name: "" }])).toBeNull();
    expect(heroEpisodeTitle([episode, { ...episode, number: 5 }])).toBeNull();
  });
});

describe("heroAvailability (FR-014, FR-029)", () => {
  const netflixSite = "https://www.netflix.com/title/80057281";

  it("falls back to the TVmaze link when the lookup fails, as Show detail does", () => {
    expect(heroAvailability(undefined, false, true, netflixSite, "SE")).toEqual(
      { kind: "button", link: expect.objectContaining({ service: "Netflix" }) },
    );
  });

  it("shows nothing when the lookup fails and TVmaze has no service link", () => {
    expect(heroAvailability(undefined, false, true, null, "SE")).toEqual({
      kind: "none",
    });
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
