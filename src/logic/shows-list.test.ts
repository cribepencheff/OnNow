import { showsRowLine, sortShowsByTitle } from "./shows-list";
import type { TvMazeEpisode, TvMazeSeason } from "@/api/tvmaze-types";

function episode(airdate: string): TvMazeEpisode {
  return {
    id: 1,
    url: "",
    name: "Episode",
    season: 1,
    number: 1,
    type: "regular",
    airdate,
    airtime: "20:00",
    airstamp: `${airdate}T20:00:00+00:00`,
    runtime: 30,
    image: null,
    summary: null,
  };
}

function season(
  premiereDate: string | null,
  episodeOrder: number | null = null,
): TvMazeSeason {
  return {
    id: 1,
    url: "",
    number: 2,
    name: "",
    episodeOrder,
    premiereDate,
    endDate: null,
    network: null,
    webChannel: null,
    image: null,
    summary: null,
  };
}

describe("showsRowLine (PRD 5.3, FR-010, FR-035)", () => {
  it("formats a running show's upcoming episode date", () => {
    expect(
      showsRowLine(
        { kind: "episode", episode: episode("2026-09-24") },
        "Running",
      ),
    ).toBe("Next: Thu 24 Sep");
  });

  it("formats an announced season's premiere date for a show between seasons", () => {
    expect(
      showsRowLine(
        { kind: "announced-season", season: season("2026-12-01") },
        "Running",
      ),
    ).toBe("Next: Tue 1 Dec");
  });

  it("falls back to the show's status when between seasons with no announced date", () => {
    expect(
      showsRowLine(
        { kind: "announced-season", season: season(null, 8) },
        "Running",
      ),
    ).toBe("Running");
  });

  it("shows the status verbatim for an ended show", () => {
    expect(showsRowLine({ kind: "status", status: "Ended" }, "Ended")).toBe(
      "Ended",
    );
  });
});

describe("sortShowsByTitle (PRD 5.3)", () => {
  it("sorts followed shows alphabetically by title", () => {
    const shows = [
      { show: { name: "Silo" } },
      { show: { name: "Foundation" } },
      { show: { name: "The Bear" } },
    ];

    expect(sortShowsByTitle(shows).map((s) => s.show.name)).toEqual([
      "Foundation",
      "Silo",
      "The Bear",
    ]);
  });

  it("does not mutate the original array", () => {
    const shows = [{ show: { name: "Silo" } }, { show: { name: "Ended" } }];
    const original = [...shows];

    sortShowsByTitle(shows);

    expect(shows).toEqual(original);
  });
});
