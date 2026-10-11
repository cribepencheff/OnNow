import { StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
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

  it("gives a light haptic on a tab change, not on a tap on the active tab", async () => {
    const haptic = jest.spyOn(Haptics, "impactAsync");
    const rendered = renderRouter("src/app", { initialUrl: "/calendar" });
    await rendered;

    await fireEvent.press(screen.getByTestId("tab-calendar"));
    expect(haptic).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId("tab-shows"));
    expect(haptic).toHaveBeenCalledTimes(1);
    expect(haptic).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);

    haptic.mockRestore();
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
