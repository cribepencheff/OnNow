import { StyleSheet, Text } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { PosterRow } from "./PosterRow";
import { ROW_CONTROL_HEIGHT, RowRefresh } from "./RowRefresh";
import { cardHeight } from "./ShowCard";

const CARD_HEIGHT = cardHeight(false);

let mockReduceMotion = false;
jest.mock("@/hooks/useAccessibilityFlags", () => ({
  useAccessibilityFlags: () => ({
    reduceMotionEnabled: mockReduceMotion,
    screenReaderEnabled: false,
  }),
}));

// CRI-110, CRI-127: a loading row keeps its space, so nothing moves when
// it appears.
describe("PosterRow (FR-038, FR-039)", () => {
  it("shows skeleton cards on a first load, at the cards' height, hidden from screen readers (CRI-127)", async () => {
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

    expect(screen.getByText("Airing this week")).toBeTruthy();
    const strip = screen.getByTestId("row-skeleton", {
      includeHiddenElements: true,
    });
    expect(StyleSheet.flatten(strip.props.style).height).toBe(CARD_HEIGHT);
    // Two full cards and the peek of a third.
    expect(
      screen.getAllByTestId("skeleton-card", { includeHiddenElements: true }),
    ).toHaveLength(3);
    expect(screen.queryAllByTestId("skeleton-card")).toHaveLength(0);
  });

  it("crossfades from the skeleton to the cards once they are in (CRI-127)", async () => {
    const row = (loading: boolean) => (
      <PosterRow
        title="Airing this week"
        isLoading={loading}
        hasCards={!loading}
        testID="row"
      >
        {loading ? null : <Text>Lanterns</Text>}
      </PosterRow>
    );
    const { rerender } = await render(row(true));

    await rerender(row(false));

    expect(screen.getByText("Lanterns")).toBeTruthy();
    expect(
      screen.getByTestId("row-outgoing", { includeHiddenElements: true }),
    ).toBeTruthy();
  });

  it("is taller by the caption line when its cards have one, the skeleton too (CRI-127)", async () => {
    await render(
      <PosterRow
        title="Airing this week"
        isLoading
        hasCards={false}
        withCaption
        testID="row"
      >
        {null}
      </PosterRow>,
    );

    const strip = screen.getByTestId("row-skeleton", {
      includeHiddenElements: true,
    });
    expect(StyleSheet.flatten(strip.props.style).height).toBe(cardHeight(true));
    expect(cardHeight(true)).toBeGreaterThan(CARD_HEIGHT);
  });

  it("rests with a card at the left margin after a swipe (CRI-127)", async () => {
    await render(
      <PosterRow
        title="Airing this week"
        isLoading={false}
        hasCards
        testID="row"
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((id) => (
          <Text key={id}>{`Show ${id}`}</Text>
        ))}
      </PosterRow>,
    );

    const strip = screen.getByTestId("row-cards");
    expect(strip.props.snapToOffsets[0]).toBe(0);
    // A 150 card and the 12 gap (CRI-127).
    expect(strip.props.snapToOffsets[1]).toBe(162);
    expect(strip.props.decelerationRate).toBe("fast");
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

// CRI-123, CRI-127: one control slot under a row, never plain text; hidden
// (its slot kept) when the pool holds no more shows than the row.
describe("RowRefresh (CRI-123, CRI-127)", () => {
  it('reads "Refresh" while shows are left', async () => {
    await render(
      <RowRefresh
        control="refresh"
        onPress={jest.fn(async () => {})}
        isRefreshing={false}
        refreshHint="Shows the next shows"
        testID="refresh"
      />,
    );
    expect(screen.getByRole("button", { name: "Refresh" })).toBeTruthy();
  });

  it("is hidden, its slot kept, when there is nothing more to show", async () => {
    await render(
      <RowRefresh
        control={null}
        onPress={jest.fn(async () => {})}
        isRefreshing={false}
        refreshHint="Shows the next shows"
        testID="refresh"
      />,
    );
    expect(screen.queryByRole("button")).toBeNull();
    const slot = screen.getByTestId("refresh-hidden");
    expect(StyleSheet.flatten(slot.props.style).height).toBe(
      ROW_CONTROL_HEIGHT,
    );
  });

  it("ignores taps while a refresh runs, and shows a spinner for at least one turn", async () => {
    jest.useFakeTimers();
    try {
      const onPress = jest.fn(async () => {});
      await render(
        <RowRefresh
          control="refresh"
          onPress={onPress}
          isRefreshing={false}
          refreshHint="Shows the next shows"
          testID="refresh"
        />,
      );
      const button = screen.getByRole("button", { name: "Refresh" });

      await fireEvent.press(button);
      // The refresh itself is already done, but the turn is not.
      await fireEvent.press(button);
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(button.props.accessibilityState.busy).toBe(true);
      // A symmetrical spinner in the arrow's place, so it turns in place.
      expect(screen.getByTestId("refresh-spinner")).toBeTruthy();

      await act(async () => jest.advanceTimersByTime(800));
      expect(
        screen.getByRole("button", { name: "Refresh" }).props.accessibilityState
          .busy,
      ).toBe(false);
      expect(screen.queryByTestId("refresh-spinner")).toBeNull();
      await fireEvent.press(screen.getByRole("button", { name: "Refresh" }));
      expect(onPress).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('reads "Start over" at the end of the pool, as a button in the same slot', async () => {
    const onPress = jest.fn(async () => {});
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
