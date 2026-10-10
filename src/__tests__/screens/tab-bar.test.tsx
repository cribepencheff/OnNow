import { StyleSheet } from "react-native";
import {
  fireEvent,
  renderRouter,
  screen,
  waitFor,
} from "expo-router/testing-library";

import { takeSearchFocusRequest } from "@/hooks/search-focus";
import { t } from "@/theme/tokens";

// CRI-133: the floating tab bar, in the real navigation tree (root Stack
// wrapping the Tabs navigator), as in shows-navigation.test.tsx.
describe("Floating tab bar (real navigation)", () => {
  beforeEach(() => {
    takeSearchFocusRequest();
  });

  it("has four icon-only tabs, Home, Calendar, My shows and Search, in that order", async () => {
    const rendered = renderRouter("src/app", { initialUrl: "/calendar" });
    await rendered;

    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.props.accessibilityLabel)).toEqual([
      "Home",
      "Calendar",
      "My shows",
      "Search",
    ]);
    // No labels drawn: the titles are only accessibility labels.
    expect(screen.queryByText("My shows")).toBeNull();
  });

  it("marks the active tab and draws it on the wide light-grey pill, no accent", async () => {
    const rendered = renderRouter("src/app", { initialUrl: "/calendar" });
    await rendered;

    const active = screen.getByTestId("tab-calendar");
    const inactive = screen.getByTestId("tab-home");
    expect(active.props.accessibilityState).toMatchObject({ selected: true });
    expect(inactive.props.accessibilityState).toMatchObject({
      selected: false,
    });

    const activeStyle = StyleSheet.flatten(active.props.style);
    expect(activeStyle.backgroundColor).toBe(t.tabBarActivePill);
    expect(activeStyle.paddingHorizontal).toBeGreaterThan(
      activeStyle.paddingVertical,
    );
    expect(
      StyleSheet.flatten(inactive.props.style).backgroundColor,
    ).toBeUndefined();
  });

  it("opens the Search screen directly from its tab, in typing mode", async () => {
    const rendered = renderRouter("src/app", { initialUrl: "/calendar" });
    await rendered;

    await fireEvent.press(screen.getByTestId("tab-search"));

    expect(rendered.getPathname()).toBe("/search");
    await waitFor(() =>
      expect(screen.getByTestId("search-input")).toBeTruthy(),
    );
    expect(screen.getByTestId("tab-search").props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true }),
    );
  });

  it("goes to the Search tab from Shows' search field, keeping the tab bar", async () => {
    const rendered = renderRouter("src/app", { initialUrl: "/shows" });
    await rendered;

    await fireEvent.press(screen.getByLabelText("Search shows"));

    expect(rendered.getPathname()).toBe("/search");
    expect(screen.getByTestId("tab-search").props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true }),
    );
  });
});
