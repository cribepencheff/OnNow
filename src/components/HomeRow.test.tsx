import { StyleSheet, Text } from "react-native";
import { render, screen } from "@testing-library/react-native";

import { HomeRow } from "./HomeRow";
import { CARD_HEIGHT } from "./ShowCard";

// CRI-110: a loading row keeps its space, so nothing moves when it appears.
describe("HomeRow (FR-038, FR-039)", () => {
  it("keeps a card's full height while loading, hidden from screen readers", async () => {
    await render(
      <HomeRow title="Airing this week" isLoading hasCards={false} testID="row">
        {null}
      </HomeRow>,
    );

    const row = screen.getByTestId("row", { includeHiddenElements: true });
    expect(row.props.importantForAccessibility).toBe("no-hide-descendants");
    expect(StyleSheet.flatten(row.props.style).opacity).toBe(0);
    const strip = screen.getByTestId("row-cards", {
      includeHiddenElements: true,
    });
    expect(StyleSheet.flatten(strip.props.style).minHeight).toBe(CARD_HEIGHT);
  });

  it("shows its cards once they are in", async () => {
    await render(
      <HomeRow title="Airing this week" isLoading={false} hasCards testID="row">
        <Text>Lanterns</Text>
      </HomeRow>,
    );

    expect(screen.getByText("Airing this week")).toBeTruthy();
    expect(screen.getByText("Lanterns")).toBeTruthy();
  });

  it("is removed when it ends up with no cards", async () => {
    await render(
      <HomeRow
        title="Airing this week"
        isLoading={false}
        hasCards={false}
        testID="row"
      >
        {null}
      </HomeRow>,
    );

    expect(
      screen.queryByTestId("row", { includeHiddenElements: true }),
    ).toBeNull();
  });
});
