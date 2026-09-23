import { fireEvent, renderRouter, screen } from "expo-router/testing-library";

// CRI-66 fix: the "+" that opens Search must render through the Home tab's
// own native header (`headerRight` in `(tabs)/_layout.tsx`), not as custom
// content in the screen body; an earlier version used an in-screen row and
// the button did not render in Expo Go. This renders the real navigation
// tree (root Stack, with `headerShown: false`, wrapping the Tabs navigator)
// so a header that is hidden or fails to render is caught here, not only in
// an isolated HomeScreen component test.
describe("Home header (FR-007)", () => {
  it("shows the + button in Home's real navigation header and opens Search when pressed", async () => {
    const rendered = renderRouter("src/app", { initialUrl: "/" });
    await rendered;

    const addButton = screen.getByLabelText("Add show");
    await fireEvent.press(addButton);

    expect(rendered.getPathname()).toBe("/search");
  });
});
