import externalIdsJayZ from "@/api/fixtures/tmdb-external-ids-jay-z.json";
import {
  hasAllExternalIds,
  mergeExternalIds,
  tmdbExternalIds,
} from "./external-ids";

describe("external IDs (CRI-103)", () => {
  it("reads IMDb and TheTVDB IDs from TMDB (JAŸ-Z IN 8)", () => {
    expect(tmdbExternalIds(externalIdsJayZ)).toEqual({
      imdb: "tt43619535",
      thetvdb: 479659,
    });
    expect(tmdbExternalIds({ imdb_id: "", tvdb_id: null })).toEqual({
      imdb: null,
      thetvdb: null,
    });
  });

  it("fills TVmaze's gaps from TMDB", () => {
    expect(
      mergeExternalIds(
        { imdb: null, thetvdb: null },
        { imdb: "tt43619535", thetvdb: 479659 },
      ),
    ).toEqual({ imdb: "tt43619535", thetvdb: 479659 });
  });

  it("keeps TVmaze's own IDs over TMDB's", () => {
    expect(
      mergeExternalIds(
        { imdb: "tt1", thetvdb: null },
        { imdb: "tt2", thetvdb: 7 },
      ),
    ).toEqual({ imdb: "tt1", thetvdb: 7 });
  });

  it("keeps TVmaze's IDs when TMDB has nothing", () => {
    expect(mergeExternalIds({ imdb: "tt1", thetvdb: null }, null)).toEqual({
      imdb: "tt1",
      thetvdb: null,
    });
  });

  it("knows when TVmaze already has both, so TMDB is not asked", () => {
    expect(hasAllExternalIds({ imdb: "tt1", thetvdb: 7 })).toBe(true);
    expect(hasAllExternalIds({ imdb: "tt1", thetvdb: null })).toBe(false);
  });
});
