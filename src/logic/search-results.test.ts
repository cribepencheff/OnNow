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
// Owner, 2026-10-22: a show TVmaze still lists as "In Development" but has
// not updated in two years has most likely not gone ahead, such as Prime
// Video's The Girl with the Dragon Tattoo (TVmaze 48361, last updated
// 2023). Search leaves it out; a newer one with the same name stays.
describe("rankSearchResults: stale shows in development", () => {
  const NOW = Date.parse("2026-10-22T12:00:00Z");
  const secondsAgo = (days: number) =>
    Math.round((NOW - days * 24 * 60 * 60 * 1000) / 1000);
  const show = (id: number, status: string, updated?: number) => ({
    score: 1,
    show: { ...showWithStatus(status), id, updated },
  });

  it("leaves out a show in development not updated for two years", () => {
    const ranked = rankSearchResults(
      [
        show(48361, "In Development", secondsAgo(3 * 365)),
        show(91814, "In Development", secondsAgo(165)),
      ],
      NOW,
    );
    expect(ranked.map(({ show }) => show.id)).toEqual([91814]);
  });

  it("keeps an ended show however old, and one in development without an update time", () => {
    const ranked = rankSearchResults(
      [
        show(1, "Ended", secondsAgo(10 * 365)),
        show(2, "In Development", undefined),
        show(3, "To Be Determined", secondsAgo(5 * 365)),
      ],
      NOW,
    );
    expect(ranked.map(({ show }) => show.id)).toEqual([1, 2, 3]);
  });

  it("keeps one in development updated just under two years ago", () => {
    const ranked = rankSearchResults(
      [show(4, "In Development", secondsAgo(2 * 365 - 2))],
      NOW,
    );
    expect(ranked).toHaveLength(1);
  });
});

describe("rankSearchResults", () => {
  it("keeps running shows above ended ones", () => {
    const running = showWithStatus("Running");
    const ended = { ...showWithStatus("Ended"), id: running.id + 1 };
    const results: TvMazeSearchResult[] = [
      { score: 1, show: ended },
      { score: 1, show: running },
    ];

    const ranked = rankSearchResults(results);

    expect(ranked[0].show.status).toBe("Running");
    expect(ranked[1].show.status).toBe("Ended");
  });

  it("lists each show once (PRD 5.4)", () => {
    const show = showWithStatus("Running");
    const other = { ...showWithStatus("Ended"), id: show.id + 1 };
    const results: TvMazeSearchResult[] = [
      { score: 2, show },
      { score: 1, show: other },
      { score: 1, show },
    ];

    expect(rankSearchResults(results).map((r) => r.show.id)).toEqual([
      show.id,
      other.id,
    ]);
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
  it("combines the premiere year and up to three genres", () => {
    const show = {
      ...showWithStatus("Running"),
      premiered: "2022-04-01",
      genres: ["Drama", "Thriller", "Espionage", "Crime"],
    };
    expect(searchResultMetaLine(show)).toBe(
      "2022 · Drama, Thriller, Espionage",
    );
  });

  it("leaves out a missing year or missing genres", () => {
    const base = showWithStatus("Running");
    expect(
      searchResultMetaLine({ ...base, premiered: null, genres: ["Drama"] }),
    ).toBe("Drama");
    expect(
      searchResultMetaLine({ ...base, premiered: "2026-09-16", genres: [] }),
    ).toBe("2026");
    expect(searchResultMetaLine({ ...base, premiered: null, genres: [] })).toBe(
      "",
    );
  });

  it("does not show the status (PRD 5.4)", () => {
    const show = {
      ...showWithStatus("To Be Determined"),
      premiered: "2026-09-16",
      genres: [],
    };
    expect(searchResultMetaLine(show)).toBe("2026");
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
