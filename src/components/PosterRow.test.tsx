import { StyleSheet, Text } from "react-native";
import { render, screen } from "@testing-library/react-native";

import { PosterRow } from "./PosterRow";
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
      >
        {null}
      </PosterRow>,
    );

    expect(screen.getByText("That's all this week")).toBeTruthy();
    const empty = screen.getByTestId("row-empty");
    expect(StyleSheet.flatten(empty.props.style).height).toBe(CARD_HEIGHT);
  });

  // CRI-131: more cards are appended; earlier ones stay where they are.
  it("appends more cards, earlier ones staying in place, with no crossfade", async () => {
    const row = (names: string[]) => (
      <PosterRow
        title="Airing this week"
        isLoading={false}
        hasCards
        testID="row"
      >
        {names.map((name) => (
          <Text key={name}>{name}</Text>
        ))}
      </PosterRow>
    );
    const { rerender } = await render(row(["Lanterns"]));

    await rerender(row(["Lanterns", "Scrubs"]));

    expect(screen.getByText("Lanterns")).toBeTruthy();
    expect(screen.getByText("Scrubs")).toBeTruthy();
    expect(
      screen.queryByTestId("row-outgoing", { includeHiddenElements: true }),
    ).toBeNull();
  });

  it("shows two skeleton cards at its end while more is on its way (CRI-131)", async () => {
    await render(
      <PosterRow
        title="Airing this week"
        isLoading={false}
        hasCards
        isLoadingMore
        testID="row"
      >
        <Text>Lanterns</Text>
      </PosterRow>,
    );

    expect(screen.getByText("Lanterns")).toBeTruthy();
    expect(
      screen.getAllByTestId("skeleton-card", { includeHiddenElements: true }),
    ).toHaveLength(2);
  });

  it("swaps the first skeleton for the cards at once with Reduce Motion on", async () => {
    mockReduceMotion = true;
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
      screen.queryByTestId("row-outgoing", { includeHiddenElements: true }),
    ).toBeNull();
    mockReduceMotion = false;
  });
});
