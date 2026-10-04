import { imdbRating, imdbTitleUrl } from "./imdb-rating";
import omdbMobland from "@/api/fixtures/omdb-mobland.json";
import omdbNeagley from "@/api/fixtures/omdb-neagley.json";
import omdbNotFound from "@/api/fixtures/omdb-not-found.json";

describe("imdbRating (CRI-87, ADR 0013)", () => {
  it("reads the rating from a real OMDb response (MobLand)", () => {
    expect(imdbRating(omdbMobland)).toBe("8.3");
  });

  it('treats "N/A" as no rating (Neagley)', () => {
    expect(imdbRating(omdbNeagley)).toBeNull();
  });

  it("treats a missing or empty rating as no rating", () => {
    expect(imdbRating({ Response: "True" })).toBeNull();
    expect(imdbRating({ Response: "True", imdbRating: "" })).toBeNull();
  });

  it("treats an OMDb error response as no rating", () => {
    expect(imdbRating(omdbNotFound)).toBeNull();
    expect(imdbRating({ Response: "False", imdbRating: "7.0" })).toBeNull();
  });
});

describe("imdbTitleUrl (CRI-87)", () => {
  it("links to the title page on IMDb", () => {
    expect(imdbTitleUrl("tt31510819")).toBe(
      "https://www.imdb.com/title/tt31510819/",
    );
  });
});
