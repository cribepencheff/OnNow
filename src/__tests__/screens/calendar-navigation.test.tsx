import { renderRouter, screen, waitFor } from "expo-router/testing-library";

// CRI-67: renders the real navigation tree (root Stack wrapping the Tabs
// navigator) landing on the Calendar tab, so a missing or hidden element in
// the actual tree is caught here, not only in an isolated component test
// (see home-header.test.tsx for the same reasoning on Home's header).
describe("Calendar tab (real navigation)", () => {
  it("shows the month grid and today preselected", async () => {
    const rendered = renderRouter("src/app", { initialUrl: "/calendar" });
    await rendered;

    expect(screen.getByText(/^[A-Z][a-z]+ \d{4}$/)).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByText("Nothing on this day.")).toBeTruthy(),
    );
  });
});
