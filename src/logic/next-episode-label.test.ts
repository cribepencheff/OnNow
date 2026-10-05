import { formatLabelDate, nextDateLabel } from "./next-episode-label";

// The date label of a release, used by Show detail's premiere cards
// (PRD 5.5, CRI-78). Never a time of day (ADR 0001).
describe("nextDateLabel (PRD 5.5, CRI-78)", () => {
  it('reads "New today" on the day itself', () => {
    expect(nextDateLabel("2026-09-21", "2026-09-21")).toBe("New today");
    expect(nextDateLabel("2026-09-21", "2026-09-21", 4)).toBe("New today");
  });

  it('reads "Next: Tomorrow" the day before', () => {
    expect(nextDateLabel("2026-09-22", "2026-09-21")).toBe("Next: Tomorrow");
  });

  it("reads the date further away, with the year only in another year", () => {
    expect(nextDateLabel("2026-09-24", "2026-09-21")).toBe("Next: Thu 24 Sep");
    expect(nextDateLabel("2027-07-09", "2026-09-21")).toBe(
      "Next: Fri 9 Jul 2027",
    );
  });

  it("reads a season premiere as a premiere instead of Next", () => {
    expect(nextDateLabel("2026-09-22", "2026-09-21", 4)).toBe(
      "Season 4 premiere · Tomorrow",
    );
    expect(nextDateLabel("2027-07-09", "2026-09-21", 4)).toBe(
      "Season 4 premiere · Fri 9 Jul 2027",
    );
  });
});

// CRI-78: a date in another year than today's shows its year, so a date
// far ahead does not read like one that has passed ("Fri 9 Jul" seen in
// September). Dates in the current year stay short.
describe("formatLabelDate (PRD 5.4, FR-025, CRI-78)", () => {
  it("leaves out the year for a date later this year", () => {
    expect(formatLabelDate("2026-11-20", "2026-09-24")).toBe("Fri 20 Nov");
  });

  it("includes the year for a date next year", () => {
    expect(formatLabelDate("2027-07-09", "2026-09-24")).toBe("Fri 9 Jul 2027");
  });

  it("includes the year for 2 January seen from late December", () => {
    expect(formatLabelDate("2027-01-02", "2026-12-29")).toBe("Sat 2 Jan 2027");
  });

  it("leaves out the year for a date in January seen from January", () => {
    expect(formatLabelDate("2027-01-20", "2027-01-02")).toBe("Wed 20 Jan");
  });
});
