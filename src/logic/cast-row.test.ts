import { castRowPeople } from "./cast-row";

const TMDB = [
  { name: "Gary Oldman", character: "Jackson Lamb", profilePath: "/go.jpg" },
  { name: "No Photo", character: null, profilePath: null },
];
const TVMAZE = [
  {
    personId: 45775,
    name: "Gary Oldman",
    imageUrl: "https://static.tvmaze.com/old.jpg",
    character: "Jackson Lamb",
  },
];
const CREATORS = [{ name: "Will Smith", profilePath: "/ws.jpg" }];

// CRI-143, owner 2026-11-08: TMDB's cast first, for its current portraits.
describe("castRowPeople (CRI-143)", () => {
  it("takes TMDB's cast, with its portraits, then the creators", () => {
    expect(
      castRowPeople(TMDB, TVMAZE, CREATORS).map((p) => [
        p.name,
        p.role,
        p.imageUrl,
      ]),
    ).toEqual([
      ["Gary Oldman", "Jackson Lamb", "https://image.tmdb.org/t/p/w185/go.jpg"],
      ["No Photo", null, null],
      ["Will Smith", "Creator", "https://image.tmdb.org/t/p/w185/ws.jpg"],
    ]);
  });

  it("falls back to TVmaze's cast when TMDB lists none", () => {
    expect(castRowPeople([], TVMAZE, []).map((p) => p.imageUrl)).toEqual([
      "https://static.tvmaze.com/old.jpg",
    ]);
  });

  it("is empty with no one anywhere", () => {
    expect(castRowPeople([], [], [])).toEqual([]);
  });

  it("gives every person a key of their own", () => {
    const people = castRowPeople(
      [TMDB[0], TMDB[0]],
      [],
      [CREATORS[0], CREATORS[0]],
    );
    expect(new Set(people.map((p) => p.key)).size).toBe(4);
  });
});
