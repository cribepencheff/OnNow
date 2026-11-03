import showFoundationFixture from "@/api/fixtures/show-foundation.json";
import type { TvMazeShowWithEmbeds } from "@/api/tvmaze-types";
import { localDateFromAirstamp } from "./local-date";
import {
  DISNEY_PLUS_WEB_CHANNEL_ID,
  releaseAirstamp,
  withReleaseTimes,
} from "./release-time";

// TVmaze gives streaming episodes no airtime and a placeholder airstamp
// (ADR 0006); Disney+ releases at 6 p.m. Pacific on the airdate (ADR 0020).
function episode(airdate: string, airtime = "") {
  return { airdate, airtime, airstamp: `${airdate}T12:00:00+00:00` };
}

describe("releaseAirstamp (ADR 0020)", () => {
  it("puts a Disney+ episode without airtime at 6 p.m. Pacific daylight time", () => {
    expect(
      releaseAirstamp(episode("2026-10-27"), DISNEY_PLUS_WEB_CHANNEL_ID),
    ).toBe("2026-10-28T01:00:00.000Z");
  });

  it("puts a Disney+ episode without airtime at 6 p.m. Pacific standard time", () => {
    expect(
      releaseAirstamp(episode("2026-11-03"), DISNEY_PLUS_WEB_CHANNEL_ID),
    ).toBe("2026-11-04T02:00:00.000Z");
  });

  it("VisionQuest episode 7 lands on Wednesday in Sweden, not Tuesday", () => {
    const airstamp = releaseAirstamp(
      episode("2026-11-03"),
      DISNEY_PLUS_WEB_CHANNEL_ID,
    );
    expect(localDateFromAirstamp(airstamp, "Europe/Stockholm")).toBe(
      "2026-11-04",
    );
  });

  it("stays on the airdate for a viewer in the US", () => {
    const airstamp = releaseAirstamp(
      episode("2026-11-03"),
      DISNEY_PLUS_WEB_CHANNEL_ID,
    );
    expect(localDateFromAirstamp(airstamp, "America/New_York")).toBe(
      "2026-11-03",
    );
  });

  it("keeps TVmaze's airstamp when the episode has an airtime", () => {
    const withTime = {
      airdate: "2026-11-03",
      airtime: "21:00",
      airstamp: "2026-11-04T02:00:00+00:00",
    };
    expect(releaseAirstamp(withTime, DISNEY_PLUS_WEB_CHANNEL_ID)).toBe(
      withTime.airstamp,
    );
  });

  it("keeps TVmaze's airstamp for other services", () => {
    expect(releaseAirstamp(episode("2026-11-03"), 1)).toBe(
      "2026-11-03T12:00:00+00:00",
    );
    expect(releaseAirstamp(episode("2026-11-03"), null)).toBe(
      "2026-11-03T12:00:00+00:00",
    );
  });

  it("keeps TVmaze's airstamp when there is no airdate", () => {
    const undated = { airdate: "", airtime: "", airstamp: "" };
    expect(releaseAirstamp(undated, DISNEY_PLUS_WEB_CHANNEL_ID)).toBe("");
  });
});

describe("withReleaseTimes (ADR 0020)", () => {
  const foundation = showFoundationFixture as unknown as TvMazeShowWithEmbeds;

  it("gives a Disney+ show's episodes without airtime their release", () => {
    const disneyPlus: TvMazeShowWithEmbeds = {
      ...foundation,
      webChannel: { ...foundation.webChannel!, id: DISNEY_PLUS_WEB_CHANNEL_ID },
      _embedded: {
        ...foundation._embedded,
        episodes: [
          {
            ...foundation._embedded.episodes[0],
            ...episode("2026-11-03"),
          },
        ],
      },
    };
    expect(withReleaseTimes(disneyPlus)._embedded.episodes[0].airstamp).toBe(
      "2026-11-04T02:00:00.000Z",
    );
  });

  it("returns another service's show as it is", () => {
    expect(withReleaseTimes(foundation)).toBe(foundation);
  });
});
