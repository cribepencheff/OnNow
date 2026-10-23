import { StyleSheet, Text } from "react-native";
import { render, screen } from "@testing-library/react-native";

import {
  SEARCH_FIELD_HEIGHT,
  SEARCH_FIELD_TEXT_SIZE,
  SearchFieldFrame,
  searchFieldText,
} from "./SearchField";
import { SEARCH_CLOSE_SIZE } from "./SearchHeader";
import { t, type } from "@/theme/tokens";

// Owner, 2026-10-23: the field as tall as Search's close button, its text
// smaller, and the tab bar's own magnifier, a little bigger.
describe("SearchFieldFrame", () => {
  it("is as tall as Search's close button", async () => {
    await render(
      <SearchFieldFrame>
        <Text>Search shows</Text>
      </SearchFieldFrame>,
    );
    expect(
      StyleSheet.flatten(screen.getByTestId("search-field").props.style).height,
    ).toBe(SEARCH_FIELD_HEIGHT);
    expect(SEARCH_CLOSE_SIZE).toBe(SEARCH_FIELD_HEIGHT);
  });

  it("draws the tab bar's magnifier, a little bigger than before (16)", async () => {
    await render(
      <SearchFieldFrame>
        <Text>Search shows</Text>
      </SearchFieldFrame>,
    );
    const icon = screen.getByTestId("search-field-icon");
    expect(icon.props.width).toBe(18);
  });

  it("sets its text smaller than headline", () => {
    for (const style of [searchFieldText.input, searchFieldText.placeholder]) {
      expect(style.fontSize).toBe(SEARCH_FIELD_TEXT_SIZE);
      expect(style.paddingVertical).toBe(0);
    }
    expect(SEARCH_FIELD_TEXT_SIZE).toBeLessThan(type.headline.fontSize);
    expect(searchFieldText.placeholder.color).toBe(t.inkMuted);
  });
});
