import {
  ENDED_SHOW_STALE_TIME_MS,
  SHOW_STALE_TIME_MS,
  showStaleTime,
} from "./show-staleness";

// CRI-107: an ended show is refetched far less often than a running one;
// it is still refetched, since TVmaze's status can change (a revival).
describe("showStaleTime", () => {
  it("is an hour for a running show, or one not loaded yet", () => {
    expect(showStaleTime({ status: "Running" })).toBe(SHOW_STALE_TIME_MS);
    expect(showStaleTime(undefined)).toBe(SHOW_STALE_TIME_MS);
    expect(SHOW_STALE_TIME_MS).toBe(60 * 60 * 1000);
  });

  it("is a week for an ended show", () => {
    expect(showStaleTime({ status: "Ended" })).toBe(ENDED_SHOW_STALE_TIME_MS);
    expect(ENDED_SHOW_STALE_TIME_MS).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("is an hour for any other status, such as To Be Determined", () => {
    expect(showStaleTime({ status: "To Be Determined" })).toBe(
      SHOW_STALE_TIME_MS,
    );
  });
});
