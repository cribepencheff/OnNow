import { StyleSheet } from "react-native";
import {
  fireEvent,
  renderRouter,
  screen,
  waitFor,
} from "expo-router/testing-library";

import { takeSearchFocusRequest } from "@/hooks/search-focus";
import { t } from "@/theme/tokens";

// Stands in for a screen reader's double tap: the bar's single scrub
// gesture (FloatingTabBar.tsx) cannot itself be driven from a plain tap in
// tests, so this exercises the same commit through the tab's "activate"
// accessibility action instead. The gesture's own hover tracking, haptics
// and cancel-on-exit need a real touch, tested by hand in Expo Go and by
// the Maestro flow.
function activate(testId: string) {
  return fireEvent(screen.getByTestId(testId), "accessibilityAction", {
    nativeEvent: { actionName: "activate" },
  });
}

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

  it("marks the active tab with the sliding light-grey pill, no accent, all tabs the same size", async () => {
    const rendered = renderRouter("src/app", { initialUrl: "/calendar" });
    await rendered;

    const active = screen.getByTestId("tab-calendar");
    const inactive = screen.getByTestId("tab-home");
    expect(active.props.accessibilityState).toMatchObject({ selected: true });
    expect(inactive.props.accessibilityState).toMatchObject({
      selected: false,
    });

    // No standing size difference: only the pill marks the active tab.
    const activeStyle = StyleSheet.flatten(active.props.style);
    const inactiveStyle = StyleSheet.flatten(inactive.props.style);
    expect(activeStyle).toEqual(inactiveStyle);
    expect(activeStyle.backgroundColor).toBeUndefined();

    // The pill is the full size of a tab, so wider than tall.
    const pillStyle = StyleSheet.flatten(
      screen.getByTestId("tab-bar-pill").props.style,
    );
    expect(pillStyle.backgroundColor).toBe(t.tabBarActivePill);
    expect(pillStyle.height).toBe(t.tabBarTabHeight);
    expect(t.tabBarTabWidth).toBeGreaterThan(t.tabBarTabHeight);
  });

  it("stays put when the already active tab is activated again, switches otherwise", async () => {
    const rendered = renderRouter("src/app", { initialUrl: "/calendar" });
    await rendered;

    await activate("tab-calendar");
    expect(rendered.getPathname()).toBe("/calendar");

    await activate("tab-shows");
    expect(rendered.getPathname()).toBe("/shows");
  });

  it("opens the Search screen directly from its tab, in typing mode", async () => {
    const rendered = renderRouter("src/app", { initialUrl: "/calendar" });
    await rendered;

    await activate("tab-search");

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
