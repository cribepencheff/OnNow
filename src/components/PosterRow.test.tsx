import { StyleSheet, Text } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { PosterRow } from "./PosterRow";
import { ROW_CONTROL_HEIGHT, RowRefresh } from "./RowRefresh";
import { CARD_HEIGHT } from "./ShowCard";

let mockReduceMotion = false;
jest.mock("@/hooks/useAccessibilityFlags", () => ({
  useAccessibilityFlags: () => ({
    reduceMotionEnabled: mockReduceMotion,
    screenReaderEnabled: false,
  }),
}));

// CRI-110: a loading row keeps its space, so nothing moves when it appears.
describe("PosterRow (FR-038, FR-039)", () => {
  it("keeps a card's full height while loading, hidden from screen readers", async () => {
    await render(
      <PosterRow
        title="Airing this week"
        isLoading
        hasCards={false}
        testID="row"
      >
        {null}
      </PosterRow>,
    );

    const row = screen.getByTestId("row", { includeHiddenElements: true });
    expect(row.props.importantForAccessibility).toBe("no-hide-descendants");
    expect(StyleSheet.flatten(row.props.style).opacity).toBe(0);
    const strip = screen.getByTestId("row-cards", {
      includeHiddenElements: true,
    });
    expect(StyleSheet.flatten(strip.props.style).height).toBe(CARD_HEIGHT);
  });

  it("shows its cards once they are in", async () => {
    await render(
      <PosterRow
        title="Airing this week"
        isLoading={false}
        hasCards
        testID="row"
      >
        <Text>Lanterns</Text>
      </PosterRow>,
    );

    expect(screen.getByText("Airing this week")).toBeTruthy();
    expect(screen.getByText("Lanterns")).toBeTruthy();
  });

  it("is removed when it ends up with no cards", async () => {
    await render(
      <PosterRow
        title="Airing this week"
        isLoading={false}
        hasCards={false}
        testID="row"
      >
        {null}
      </PosterRow>,
    );

    expect(
      screen.queryByTestId("row", { includeHiddenElements: true }),
    ).toBeNull();
  });

  it("keeps a fixed height whatever its cards (CRI-123)", async () => {
    await render(
      <PosterRow
        title="Airing this week"
        isLoading={false}
        hasCards
        testID="row"
      >
        <Text>Lanterns</Text>
      </PosterRow>,
    );

    const strip = screen.getByTestId("row-cards");
    expect(StyleSheet.flatten(strip.props.style).height).toBe(CARD_HEIGHT);
  });

  it("shows its empty line where the cards were, at the same height, instead of going away (CRI-123)", async () => {
    await render(
      <PosterRow
        title="Airing this week"
        isLoading={false}
        hasCards={false}
        emptyText="That's all this week"
        testID="row"
        footer={<Text>Start over</Text>}
      >
        {null}
      </PosterRow>,
    );

    expect(screen.getByText("That's all this week")).toBeTruthy();
    expect(screen.getByText("Start over")).toBeTruthy();
    const empty = screen.getByTestId("row-empty");
    expect(StyleSheet.flatten(empty.props.style).height).toBe(CARD_HEIGHT);
  });

  it("crossfades to a new batch: the old cards fade out over the new ones (CRI-123)", async () => {
    const row = (batch: number, name: string) => (
      <PosterRow
        title="Airing this week"
        isLoading={false}
        hasCards
        batch={batch}
        testID="row"
      >
        <Text>{name}</Text>
      </PosterRow>
    );
    const { rerender } = await render(row(0, "Lanterns"));

    await rerender(row(1, "Scrubs"));

    expect(screen.getByText("Scrubs")).toBeTruthy();
    const outgoing = screen.getByTestId("row-outgoing", {
      includeHiddenElements: true,
    });
    expect(outgoing.props.pointerEvents).toBe("none");
    expect(
      screen.getByText("Lanterns", { includeHiddenElements: true }),
    ).toBeTruthy();
    // Hidden from screen readers while it fades.
    expect(screen.queryByText("Lanterns")).toBeNull();
  });

  it("swaps at once with Reduce Motion on", async () => {
    mockReduceMotion = true;
    const row = (batch: number, name: string) => (
      <PosterRow
        title="Airing this week"
        isLoading={false}
        hasCards
        batch={batch}
        testID="row"
      >
        <Text>{name}</Text>
      </PosterRow>
    );
    const { rerender } = await render(row(0, "Lanterns"));

    await rerender(row(1, "Scrubs"));

    expect(screen.getByText("Scrubs")).toBeTruthy();
    expect(
      screen.queryByTestId("row-outgoing", { includeHiddenElements: true }),
    ).toBeNull();
    mockReduceMotion = false;
  });
});

// CRI-123: one control slot under a row, never gone, never plain text.
describe("RowRefresh (CRI-123)", () => {
  it('reads "Refresh" while shows are left', async () => {
    await render(
      <RowRefresh
        control="refresh"
        onPress={jest.fn()}
        isRefreshing={false}
        refreshHint="Shows the next shows"
        testID="refresh"
      />,
    );
    expect(screen.getByRole("button", { name: "Refresh" })).toBeTruthy();
  });

  it('reads "Start over" at the end of the pool, as a button in the same slot', async () => {
    const onPress = jest.fn();
    await render(
      <RowRefresh
        control="startOver"
        onPress={onPress}
        isRefreshing={false}
        refreshHint="Shows the next shows"
        testID="refresh"
      />,
    );
    const button = screen.getByRole("button", { name: "Start over" });
    await fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(StyleSheet.flatten(button.props.style).height).toBe(
      ROW_CONTROL_HEIGHT,
    );
  });
});
