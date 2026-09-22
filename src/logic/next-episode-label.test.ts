import { nextEpisodeLabel } from "./next-episode-label";
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

function season(premiereDate: string | null): TvMazeSeason {
  return {
    id: 1,
    url: "",
    number: 2,
    name: "",
    episodeOrder: null,
    premiereDate,
    endDate: null,
    network: null,
    webChannel: null,
    image: null,
    summary: null,
  };
}

// FR-025, PRD 5.4: "Next: Tue 24 Sep" or "No date yet" after following.
describe("nextEpisodeLabel", () => {
  it("formats an upcoming episode's air date", () => {
    expect(
      nextEpisodeLabel({ kind: "episode", episode: episode("2026-09-24") }),
    ).toBe("Next: Thu 24 Sep");
  });

  it("formats an announced season's premiere date", () => {
    expect(
      nextEpisodeLabel({
        kind: "announced-season",
        season: season("2026-12-01"),
      }),
    ).toBe("Next: Tue 1 Dec");
  });

  it("shows no date yet for an announced season without a premiere date", () => {
    expect(
      nextEpisodeLabel({ kind: "announced-season", season: season(null) }),
    ).toBe("No date yet");
  });

  it("shows no date yet for a show with only a status", () => {
    expect(nextEpisodeLabel({ kind: "status", status: "Ended" })).toBe(
      "No date yet",
    );
  });

  it("shows no date yet while the show's data has not loaded", () => {
    expect(nextEpisodeLabel(undefined)).toBe("No date yet");
  });
});
