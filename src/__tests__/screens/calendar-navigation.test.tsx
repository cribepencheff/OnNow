import {
  renderRouter,
  screen,
  waitFor,
  within,
} from "expo-router/testing-library";

// CRI-67: renders the real navigation tree (root Stack wrapping the Tabs
// navigator) landing on the Calendar tab, so a missing or hidden element in
// the actual tree is caught here, not only in an isolated component test
// (see home-header.test.tsx for the same reasoning on Home's header).
describe("Calendar tab (real navigation)", () => {
  it("shows the month grid and today preselected", async () => {
    const rendered = renderRouter("src/app", { initialUrl: "/calendar" });
    await rendered;

    // The month title lives in react-native-calendars' static header, one
    // accessibility-hidden "adjustable" control by design: real, visible
    // text, just not queryable without hidden: true. Scoped to the static
    // header specifically, since the library also renders one (hidden,
    // covered) header per buffered month item with the same title.
    const staticHeader = within(
      screen.getByTestId("calendar-grid.staticHeader", { hidden: true }),
    );
    expect(
      staticHeader.getByText(/^[A-Z][a-z]+ \d{4}$/, { hidden: true }),
    ).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByText("Nothing on this day.")).toBeTruthy(),
    );
  });
});
