import {
  fireEvent,
  renderRouter,
  screen,
  waitFor,
} from "expo-router/testing-library";

// CRI-68: renders the real navigation tree (root Stack wrapping the Tabs
// navigator) landing on the Shows tab, so a missing or hidden element in
// the actual tree is caught here, not only in an isolated component test
// (see home-header.test.tsx for the same reasoning on Home's header).
describe("Shows tab (real navigation)", () => {
  // Owner, 2026-10-22: the header reads "My shows", as the tab does, left
  // aligned with the content.
  it('titles the screen "My shows", left aligned', async () => {
    const rendered = renderRouter("src/app", { initialUrl: "/shows" });
    await rendered;
    expect(await screen.findByText("My shows")).toBeTruthy();
    expect(screen.queryByText("Shows")).toBeNull();
  });

  it("shows the empty follow list and opens Search from the search field", async () => {
    const rendered = renderRouter("src/app", { initialUrl: "/shows" });
    await rendered;

    await waitFor(() =>
      expect(screen.getByTestId("shows-empty-state")).toBeTruthy(),
    );

    await fireEvent.press(screen.getByLabelText("Search shows"));

    expect(rendered.getPathname()).toBe("/search");
  });
});
