import type { TvMazeShow } from "@/api/tvmaze-types";
import { searchStatusLabel, tmdbRating } from "./show-rating";

const show = (fields: Partial<TvMazeShow>) => fields as TvMazeShow;

// ADR 0019: TMDB's users' average, from the find answer the app already
// has, so it costs no request.
describe("tmdbRating", () => {
  const find = (vote_average?: number, vote_count?: number) => ({
    tv_results: [{ id: 1, vote_average, vote_count }],
  });

  it("gives TMDB's average with one decimal", () => {
    expect(tmdbRating(find(8, 1249))).toEqual({
      value: "8.0",
      url: "https://www.themoviedb.org/tv/1",
    });
    expect(tmdbRating(find(8.36, 1249))?.value).toBe("8.4");
  });

  it("needs at least 50 votes", () => {
    expect(tmdbRating(find(5.9, 17))).toBeNull();
    expect(tmdbRating(find(7.6, 49))).toBeNull();
    expect(tmdbRating(find(7.6, 50))?.value).toBe("7.6");
  });

  it("is nothing without a TMDB match or an average", () => {
    expect(tmdbRating({})).toBeNull();
    expect(tmdbRating({ tv_results: [] })).toBeNull();
    expect(tmdbRating(find(undefined, 100))).toBeNull();
    expect(tmdbRating(find(0, 100))).toBeNull();
  });
});

// Owner, 2026-10-22: a Search row's status from the search result alone,
// no request of its own.
describe("searchStatusLabel", () => {
  it('says "Airing" for a running show', () => {
    expect(searchStatusLabel(show({ status: "Running" }))).toBe("Airing");
  });

  it("gives an ended show its last year", () => {
    expect(
      searchStatusLabel(show({ status: "Ended", ended: "2017-05-14" })),
    ).toBe("Ended · 2017");
    expect(searchStatusLabel(show({ status: "Ended", ended: null }))).toBe(
      "Ended",
    );
  });

  it("words TVmaze's other statuses as Show detail does", () => {
    expect(searchStatusLabel(show({ status: "To Be Determined" }))).toBe(
      "Future uncertain",
    );
    expect(searchStatusLabel(show({ status: "In Development" }))).toBe(
      "In development",
    );
  });
});
