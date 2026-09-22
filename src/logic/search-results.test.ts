import {
  plainTextSummary,
  rankSearchResults,
  searchResultMetaLine,
  searchResultNetworkName,
} from "./search-results";
import searchTheBearFixture from "@/api/fixtures/search-the-bear.json";
import searchSlowHorsesFixture from "@/api/fixtures/search-slow-horses.json";
import type { TvMazeSearchResult, TvMazeShow } from "@/api/tvmaze-types";

function showWithStatus(status: string): TvMazeShow {
  return {
    ...(searchSlowHorsesFixture[0].show as TvMazeShow),
    status,
  };
}

// FR-024, PRD 5.4 edge case: "Running shows rank above ended ones."
describe("rankSearchResults", () => {
  it("keeps running shows above ended ones", () => {
    const running = showWithStatus("Running");
    const ended = showWithStatus("Ended");
    const results: TvMazeSearchResult[] = [
      { score: 1, show: ended },
      { score: 1, show: running },
    ];

    const ranked = rankSearchResults(results);

    expect(ranked[0].show.status).toBe("Running");
    expect(ranked[1].show.status).toBe("Ended");
  });

  it("preserves TVmaze's own order among shows with the same running state", () => {
    const endedResults = (searchTheBearFixture as TvMazeSearchResult[]).filter(
      (result) => result.show.status === "Ended",
    );

    const ranked = rankSearchResults(endedResults);

    expect(ranked.map((r) => r.show.name)).toEqual(
      endedResults.map((r) => r.show.name),
    );
  });

  it("does not move an unrelated status like 'In Development' above a more relevant Ended result", () => {
    // "The Bear" fixture: the correct top match ("The Bear", Ended) must
    // not be pushed below "I Kill The Bear" (In Development, not Running).
    const results = searchTheBearFixture as TvMazeSearchResult[];

    const ranked = rankSearchResults(results);

    expect(ranked.map((r) => r.show.name)).toEqual(
      results.map((r) => r.show.name),
    );
  });
});

describe("searchResultMetaLine (FR-024)", () => {
  it("combines the premiere year and status", () => {
    const show = { ...showWithStatus("Running"), premiered: "2022-04-01" };
    expect(searchResultMetaLine(show)).toBe("2022 · Running");
  });

  it("falls back to status alone when there is no premiere date", () => {
    const show = { ...showWithStatus("In Development"), premiered: null };
    expect(searchResultMetaLine(show)).toBe("In Development");
  });
});

describe("searchResultNetworkName", () => {
  it("prefers the broadcast network when present", () => {
    const show = {
      ...showWithStatus("Running"),
      network: { id: 1, name: "HBO", country: null, officialSite: null },
      webChannel: null,
    };
    expect(searchResultNetworkName(show)).toBe("HBO");
  });

  it("falls back to the web channel when there is no network", () => {
    const show = {
      ...showWithStatus("Running"),
      network: null,
      webChannel: {
        id: 2,
        name: "Apple TV",
        country: null,
        officialSite: null,
      },
    };
    expect(searchResultNetworkName(show)).toBe("Apple TV");
  });

  it("returns null when the show has neither", () => {
    const show = {
      ...showWithStatus("Running"),
      network: null,
      webChannel: null,
    };
    expect(searchResultNetworkName(show)).toBeNull();
  });
});

describe("plainTextSummary", () => {
  it("strips HTML tags from the summary", () => {
    expect(plainTextSummary("<p>Slow Horses</p><p>Second paragraph.</p>")).toBe(
      "Slow Horses Second paragraph.",
    );
  });

  it("returns null when there is no summary", () => {
    expect(plainTextSummary(null)).toBeNull();
  });
});
