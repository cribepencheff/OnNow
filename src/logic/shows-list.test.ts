import { showsSegment, sortShowsByTitle, splitBySegment } from "./shows-list";
import type { ShowState } from "./show-state";

describe("showsSegment (PRD 5.3, FR-010)", () => {
  it.each<[ShowState, "active" | "inactive"]>([
    [{ kind: "airing", nextDate: "2026-10-11" }, "active"],
    [{ kind: "airing-today" }, "active"],
    [{ kind: "airing-tba" }, "active"],
    [{ kind: "season-dated", season: 3, date: "2027-07-09" }, "active"],
    [{ kind: "season-tba", season: 3 }, "active"],
    [{ kind: "between-seasons" }, "inactive"],
    [{ kind: "future-uncertain" }, "inactive"],
    [{ kind: "ended" }, "inactive"],
    [{ kind: "other", status: "In development" }, "inactive"],
  ])("puts %j in %s", (state, segment) => {
    expect(showsSegment(state)).toBe(segment);
  });
});

describe("splitBySegment (PRD 5.3, FR-010)", () => {
  it("splits shows into Active and Inactive, each alphabetical by title", () => {
    const item = (name: string, state: ShowState) => ({
      show: { name },
      state,
    });
    const { active, inactive } = splitBySegment([
      item("Silo", { kind: "ended" }),
      item("The Bear", { kind: "airing-today" }),
      item("Andor", { kind: "between-seasons" }),
      item("Foundation", { kind: "season-tba", season: 4 }),
    ]);

    expect(active.map((i) => i.show.name)).toEqual(["Foundation", "The Bear"]);
    expect(inactive.map((i) => i.show.name)).toEqual(["Andor", "Silo"]);
  });
});

describe("sortShowsByTitle (PRD 5.3)", () => {
  it("sorts followed shows alphabetically by title", () => {
    const shows = [
      { show: { name: "Silo" } },
      { show: { name: "Foundation" } },
      { show: { name: "The Bear" } },
    ];

    expect(sortShowsByTitle(shows).map((s) => s.show.name)).toEqual([
      "Foundation",
      "Silo",
      "The Bear",
    ]);
  });

  it("does not mutate the original array", () => {
    const shows = [{ show: { name: "Silo" } }, { show: { name: "Ended" } }];
    const original = [...shows];

    sortShowsByTitle(shows);

    expect(shows).toEqual(original);
  });
});
