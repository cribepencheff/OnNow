// The hero's premiere line (ADR 0015, FR-031) and its "Open in" slot,
// which falls back like Show detail when the TMDB lookup fails.

import type { TvMazeEpisode, TvMazeShow } from "@/api/tvmaze-types";
import {
  heroAvailability,
  heroEpisodeLine,
  heroPremiereLine,
} from "./hero-carousel";

const paramount = {
  id: 1,
  name: "MobLand",
  network: null,
  webChannel: { name: "Paramount+" },
} as unknown as TvMazeShow;

const episode = { season: 2, number: 3 } as TvMazeEpisode;

describe("heroPremiereLine (FR-031, ADR 0015)", () => {
  it("labels today's episode as premiering today on the premiere service", () => {
    expect(
      heroPremiereLine(
        { show: paramount, episodes: [episode], localDate: "2026-10-04" },
        "2026-10-04",
      ),
    ).toBe("Premieres today on Paramount+");
  });

  it("says tomorrow, then a date further out", () => {
    const slide = { show: paramount, episodes: [episode] };
    expect(
      heroPremiereLine({ ...slide, localDate: "2026-10-05" }, "2026-10-04"),
    ).toBe("Premieres tomorrow on Paramount+");
    expect(
      heroPremiereLine({ ...slide, localDate: "2026-10-08" }, "2026-10-04"),
    ).toBe("Premieres Thu 8 Oct on Paramount+");
  });

  it("leaves the service out when TVmaze has none", () => {
    const show = { ...paramount, webChannel: null } as TvMazeShow;
    expect(
      heroPremiereLine(
        { show, episodes: [episode], localDate: "2026-10-04" },
        "2026-10-04",
      ),
    ).toBe("Premieres today");
  });
});

describe("heroEpisodeLine", () => {
  it("shows the code and the title of a single episode", () => {
    expect(heroEpisodeLine([{ ...episode, name: "Pilot" }])).toBe(
      "S2E3 · Pilot",
    );
  });

  it("shows only the code when the episode has no title", () => {
    expect(heroEpisodeLine([{ ...episode, name: "" }])).toBe("S2E3");
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
