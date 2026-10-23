import type { TvMazeShow } from "@/api/tvmaze-types";
import { searchStatusLabel, tvmazeRating } from "./show-rating";

const show = (fields: Partial<TvMazeShow>) => fields as TvMazeShow;

// ADR 0018 (owner, 2026-10-22): the show's rating is TVmaze's, already in
// every show TVmaze returns, so it costs no request.
describe("tvmazeRating", () => {
  it("gives TVmaze's average with one decimal", () => {
    expect(tvmazeRating(show({ rating: { average: 8 } }))).toBe("8.0");
    expect(tvmazeRating(show({ rating: { average: 7.8 } }))).toBe("7.8");
  });

  it("is nothing without one", () => {
    expect(tvmazeRating(show({ rating: { average: null } }))).toBeNull();
    expect(tvmazeRating(show({}))).toBeNull();
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
