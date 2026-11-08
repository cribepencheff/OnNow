import {
  aggregateCast,
  aggregateKeyCrew,
  CAST_MAX,
  ROW_MAX,
  castRowPeople,
  personInitials,
} from "./cast-row";

const TMDB_CAST = [
  { name: "Gary Oldman", character: "Jackson Lamb", profilePath: "/go.jpg" },
  { name: "No Photo", character: null, profilePath: null },
];
const TVMAZE_CAST = [
  {
    personId: 45775,
    name: "Gary Oldman",
    imageUrl: "https://static.tvmaze.com/old.jpg",
    character: "Jackson Lamb",
  },
];

function cast(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    name: `Actor ${i + 1}`,
    character: `Role ${i + 1}`,
    profilePath: null,
  }));
}

// CRI-143, owner 2026-11-08: as Apple TV, eight actors, then the crew,
// nineteen in all; TMDB's cast first, for its current portraits.
describe("castRowPeople (CRI-143)", () => {
  it("takes TMDB's cast, with its portraits", () => {
    expect(
      castRowPeople(TMDB_CAST, TVMAZE_CAST, [], []).map((p) => [
        p.name,
        p.role,
        p.imageUrl,
      ]),
    ).toEqual([
      ["Gary Oldman", "Jackson Lamb", "https://image.tmdb.org/t/p/w185/go.jpg"],
      ["No Photo", null, null],
    ]);
  });

  it("falls back to TVmaze's cast when TMDB lists none", () => {
    expect(
      castRowPeople([], TVMAZE_CAST, [], []).map((p) => p.imageUrl),
    ).toEqual(["https://static.tvmaze.com/old.jpg"]);
  });

  it(`keeps the first ${CAST_MAX} of the cast, in TMDB's order`, () => {
    const people = castRowPeople(cast(34), [], [], []);
    expect(people).toHaveLength(CAST_MAX);
    expect(people[0].name).toBe("Actor 1");
  });

  it("puts the crew after the cast: creators, then the key jobs in order", () => {
    const people = castRowPeople(
      TMDB_CAST,
      [],
      [{ name: "Ryu Bo-ri", profilePath: null }],
      [
        { name: "Pat Producer", job: "Executive Producer", profilePath: null },
        { name: "Mick Herron", job: "Book", profilePath: "/mh.jpg" },
        { name: "Dee Director", job: "Director", profilePath: null },
      ],
    );
    expect(people.slice(2).map((p) => [p.name, p.role])).toEqual([
      ["Ryu Bo-ri", "Creator"],
      ["Mick Herron", "Book"],
      ["Dee Director", "Director"],
      ["Pat Producer", "Executive Producer"],
    ]);
  });

  it("shows one crew member once, with every job", () => {
    const people = castRowPeople(
      [],
      [],
      [{ name: "Kim Writer", profilePath: null }],
      [
        { name: "Kim Writer", job: "Writer", profilePath: null },
        { name: "Kim Writer", job: "Director", profilePath: "/k.jpg" },
      ],
    );
    expect(people).toEqual([
      expect.objectContaining({
        name: "Kim Writer",
        role: "Creator, Director, Writer",
        imageUrl: "https://image.tmdb.org/t/p/w185/k.jpg",
      }),
    ]);
  });

  it(`stops at ${ROW_MAX} people in all`, () => {
    const crew = Array.from({ length: 20 }, (_, i) => ({
      name: `Producer ${i + 1}`,
      job: "Executive Producer",
      profilePath: null,
    }));
    expect(castRowPeople(cast(8), [], [], crew)).toHaveLength(ROW_MAX);
  });

  it("gives every person a key of their own", () => {
    const people = castRowPeople(
      [TMDB_CAST[0], TMDB_CAST[0]],
      [],
      [],
      [{ name: "Gary Oldman", job: "Executive Producer", profilePath: null }],
    );
    expect(new Set(people.map((p) => p.key)).size).toBe(3);
  });

  it("is empty with no one anywhere", () => {
    expect(castRowPeople([], [], [], [])).toEqual([]);
  });
});

// Owner, 2026-11-08: as Apple TV, a circle with initials without a photo.
describe("personInitials (CRI-143)", () => {
  it("takes the first letters of the first and last name", () => {
    expect(personInitials("Gary Oldman")).toBe("GO");
    expect(personInitials("Kristin Scott Thomas")).toBe("KT");
    expect(personInitials("Kim You-jung")).toBe("KY");
    expect(personInitials("Jinyoung")).toBe("J");
    expect(personInitials("  ")).toBe("");
  });
});

// Owner, 2026-11-08: the cast over every season, so Slow Horses' Rosalind
// Eleazar (29 of 36 episodes, missing from season 6's credits) is in it.
describe("aggregateCast and aggregateKeyCrew (CRI-143)", () => {
  const credits = {
    cast: [
      {
        name: "Hugo Weaving",
        profile_path: "/hw.jpg",
        total_episode_count: 6,
        roles: [{ character: "Frank Harkness", episode_count: 6 }],
      },
      {
        name: "Rosalind Eleazar",
        profile_path: "/re.jpg",
        total_episode_count: 29,
        roles: [
          { character: "Guest", episode_count: 1 },
          { character: "Louisa Guy", episode_count: 28 },
        ],
      },
      {
        name: "Gary Oldman",
        profile_path: null,
        total_episode_count: 36,
        roles: [{ character: "Jackson Lamb", episode_count: 36 }],
      },
      { name: " ", total_episode_count: 99, roles: [] },
    ],
    crew: [
      {
        name: "Camera Person",
        total_episode_count: 30,
        jobs: [{ job: "Camera Operator", episode_count: 30 }],
      },
      {
        name: "Gary Oldman",
        profile_path: "/go.jpg",
        total_episode_count: 36,
        jobs: [{ job: "Executive Producer", episode_count: 36 }],
      },
      {
        name: "Will Smith",
        total_episode_count: 12,
        jobs: [
          { job: "Writer", episode_count: 12 },
          { job: "Executive Producer", episode_count: 12 },
        ],
      },
    ],
  };

  it("orders the cast by episodes over every season, with each one's main role", () => {
    expect(aggregateCast(credits)).toEqual([
      { name: "Gary Oldman", character: "Jackson Lamb", profilePath: null },
      {
        name: "Rosalind Eleazar",
        character: "Louisa Guy",
        profilePath: "/re.jpg",
      },
      {
        name: "Hugo Weaving",
        character: "Frank Harkness",
        profilePath: "/hw.jpg",
      },
    ]);
  });

  it(`keeps the first ${CAST_MAX} of the cast`, () => {
    const many = {
      cast: Array.from({ length: 20 }, (_, i) => ({
        name: `Actor ${i}`,
        total_episode_count: 20 - i,
        roles: [],
      })),
    };
    expect(aggregateCast(many)).toHaveLength(CAST_MAX);
  });

  it("keeps the crew in the key jobs only, one entry per job, most episodes first", () => {
    expect(aggregateKeyCrew(credits)).toEqual([
      {
        name: "Gary Oldman",
        job: "Executive Producer",
        profilePath: "/go.jpg",
      },
      { name: "Will Smith", job: "Writer", profilePath: null },
      { name: "Will Smith", job: "Executive Producer", profilePath: null },
    ]);
  });

  it("is empty without credits", () => {
    expect(aggregateCast(undefined)).toEqual([]);
    expect(aggregateKeyCrew(undefined)).toEqual([]);
  });
});
