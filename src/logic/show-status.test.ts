import { statusLabel } from "./show-status";

// CRI-81: TVmaze's fixed status values in plain words. A translation of
// TVmaze's own vocabulary, not a guess (data first).
describe("statusLabel (FR-024, FR-028, FR-035, CRI-81)", () => {
  it.each([
    ["To Be Determined", "Renewal not announced"],
    ["In Development", "In development"],
    ["Running", "Running"],
    ["Ended", "Ended"],
  ])("shows %s as %s", (status, label) => {
    expect(statusLabel(status)).toBe(label);
  });

  it("passes any other value through unchanged", () => {
    expect(statusLabel("Something New")).toBe("Something New");
  });
});
