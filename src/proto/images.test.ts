// PROTOTYPE (proto/home-backdrop, not for merge): backdropPickTrigger's
// re-pick window (HERO_BACKDROP_LEAD_DAYS, HERO_BACKDROP_SETTLE_DAYS).

import { backdropPickTrigger } from "./images";

const STORED = { pickedForReleaseDate: "2026-06-01" };

describe("backdropPickTrigger", () => {
  it("picks immediately when nothing is stored yet (followed), regardless of dates", () => {
    expect(backdropPickTrigger(null, "2026-06-10", null, null)).toEqual({
      should: true,
      reason: "followed",
      releaseDate: null,
    });
  });

  it("re-picks the day before an upcoming release (lead-in window)", () => {
    expect(
      backdropPickTrigger(STORED, "2026-06-09", "2026-06-01", "2026-06-10"),
    ).toEqual({
      should: true,
      reason: "new-episode",
      releaseDate: "2026-06-01",
    });
  });

  it("does not yet re-pick two days before an upcoming release (outside the 1-day lead-in)", () => {
    expect(
      backdropPickTrigger(STORED, "2026-06-08", "2026-06-01", "2026-06-10"),
    ).toEqual({ should: false });
  });

  it("re-picks on the release day itself (start of the settle window)", () => {
    expect(
      backdropPickTrigger(STORED, "2026-06-01", "2026-06-01", "2026-06-10"),
    ).toEqual({
      should: true,
      reason: "new-episode",
      releaseDate: "2026-06-01",
    });
  });

  it("re-picks up to 3 days after a release (settle window)", () => {
    expect(
      backdropPickTrigger(STORED, "2026-06-04", "2026-06-01", null),
    ).toEqual({
      should: true,
      reason: "new-episode",
      releaseDate: "2026-06-01",
    });
  });

  it("does not re-pick once the settle window has passed", () => {
    expect(
      backdropPickTrigger(STORED, "2026-06-05", "2026-06-01", null),
    ).toEqual({ should: false });
  });

  it("does not re-pick with no stored backdrop trigger dates in range and nothing upcoming", () => {
    expect(
      backdropPickTrigger(
        { pickedForReleaseDate: "2026-05-01" },
        "2026-06-15",
        "2026-05-01",
        null,
      ),
    ).toEqual({ should: false });
  });

  it("re-picks when both windows could apply, using the latest release date", () => {
    // Today sits in the settle window of the last release and the lead-in
    // of the next one at once; either is enough to open the window.
    expect(
      backdropPickTrigger(STORED, "2026-06-02", "2026-06-01", "2026-06-03"),
    ).toEqual({
      should: true,
      reason: "new-episode",
      releaseDate: "2026-06-01",
    });
  });
});
