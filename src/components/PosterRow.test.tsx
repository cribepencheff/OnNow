import { StyleSheet, Text } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";

import { LOAD_MORE_PULL } from "@/logic/poster-batches";
import {
  CAUGHT_UP_TEXT,
  PosterRow,
  ROW_END_SLOT_HEIGHT,
  posterRowHeight,
} from "./PosterRow";
import { POSTER_HEIGHT, cardHeight } from "./ShowCard";

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light" },
}));

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
  it("appends more cards, earlier ones staying in place, without the first load's crossfade", async () => {
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

  // CRI-131: loading more is a deliberate drag past the row's end.
  describe("drag past the end (CRI-131)", () => {
    const names = ["Lanterns", "Scrubs", "Severance", "Andor"];
    const row = (props: Partial<Parameters<typeof PosterRow>[0]> = {}) => (
      <PosterRow
        title="Top picks for you"
        isLoading={false}
        hasCards
        hasMore
        testID="row"
        {...props}
      >
        {names.map((name) => (
          <Text key={name}>{name}</Text>
        ))}
      </PosterRow>
    );
    // A strip 700 wide on a 390 screen: its end is at 310.
    const scrollTo = (x: number) => ({
      nativeEvent: {
        contentOffset: { x, y: 0 },
        layoutMeasurement: { width: 390, height: 300 },
        contentSize: { width: 700, height: 300 },
      },
    });
    const end = 310;

    beforeEach(() => (Haptics.impactAsync as jest.Mock).mockClear());

    it("loads one batch per drag once it passes the threshold, with a light haptic", async () => {
      const onLoadMore = jest.fn();
      await render(row({ onLoadMore }));
      const strip = screen.getByTestId("row-cards");

      await fireEvent(strip, "scrollBeginDrag");
      await fireEvent.scroll(strip, scrollTo(end + LOAD_MORE_PULL - 1));
      expect(onLoadMore).not.toHaveBeenCalled();
      expect(Haptics.impactAsync).not.toHaveBeenCalled();

      await fireEvent.scroll(strip, scrollTo(end + LOAD_MORE_PULL));
      await fireEvent.scroll(strip, scrollTo(end + LOAD_MORE_PULL + 30));
      expect(onLoadMore).toHaveBeenCalledTimes(1);
      expect(Haptics.impactAsync).toHaveBeenCalledWith("light");

      // The next drag loads the next one.
      await fireEvent(strip, "scrollEndDrag");
      await fireEvent(strip, "scrollBeginDrag");
      await fireEvent.scroll(strip, scrollTo(end + LOAD_MORE_PULL));
      expect(onLoadMore).toHaveBeenCalledTimes(2);
    });

    it("loads nothing from a swipe that only coasts past the end", async () => {
      const onLoadMore = jest.fn();
      await render(row({ onLoadMore }));
      const strip = screen.getByTestId("row-cards");

      await fireEvent(strip, "scrollBeginDrag");
      await fireEvent(strip, "scrollEndDrag");
      await fireEvent.scroll(strip, scrollTo(end + LOAD_MORE_PULL + 30));
      expect(onLoadMore).not.toHaveBeenCalled();
    });

    it("loads nothing while a batch is on its way, or at the end of the pool", async () => {
      const onLoadMore = jest.fn();
      const { rerender } = await render(
        row({ onLoadMore, isLoadingMore: true }),
      );
      const drag = async () => {
        const strip = screen.getByTestId("row-cards");
        await fireEvent(strip, "scrollBeginDrag");
        await fireEvent.scroll(strip, scrollTo(end + LOAD_MORE_PULL + 30));
        await fireEvent(strip, "scrollEndDrag");
      };
      await drag();
      await rerender(row({ onLoadMore, hasMore: false }));
      await drag();
      expect(onLoadMore).not.toHaveBeenCalled();
      expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });

    it("has a spinner right of the last card, centred on the poster, only while the pool has more", async () => {
      const { rerender } = await render(row());
      const spinner = screen.getByTestId("row-load-more", {
        includeHiddenElements: true,
      });
      const style = StyleSheet.flatten(spinner.props.style);
      expect(style.height).toBe(POSTER_HEIGHT);
      expect(style.top).toBe(0);
      expect(style.right).toBeLessThan(0);

      await rerender(row({ isLoadingMore: true }));
      expect(
        screen.queryByTestId("row-load-more", { includeHiddenElements: true }),
      ).toBeNull();
      await rerender(row({ hasMore: false }));
      expect(
        screen.queryByTestId("row-load-more", { includeHiddenElements: true }),
      ).toBeNull();
    });

    it("crossfades the skeleton cards at its end into the new cards", async () => {
      const { rerender } = await render(row({ isLoadingMore: true }));
      expect(
        screen.getAllByTestId("skeleton-card", { includeHiddenElements: true }),
      ).toHaveLength(2);

      await rerender(
        <PosterRow
          title="Top picks for you"
          isLoading={false}
          hasCards
          hasMore
          testID="row"
        >
          {[...names, "Dune", "Pluribus"].map((name) => (
            <Text key={name}>{name}</Text>
          ))}
        </PosterRow>,
      );
      expect(
        screen.getByTestId("row-more-outgoing", {
          includeHiddenElements: true,
        }),
      ).toBeTruthy();
      // The new cards start transparent and fade in; earlier ones stay.
      const opacityOf = (name: string) => {
        let node = screen.getByText(name).parent;
        while (node && StyleSheet.flatten(node.props.style)?.opacity == null) {
          node = node.parent;
        }
        return StyleSheet.flatten(node?.props.style)?.opacity;
      };
      expect(opacityOf("Pluribus")).toBe(0);
      expect(opacityOf("Lanterns")).toBe(1);
    });
  });

  // CRI-131: the end of the pool is said in a slot that is always there.
  describe("the slot under the row (CRI-131)", () => {
    const row = (hasMore: boolean, isLoadingMore = false) => (
      <PosterRow
        title="Airing this week"
        isLoading={false}
        hasCards
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        testID="row"
      >
        <Text>Lanterns</Text>
      </PosterRow>
    );

    it(`says "${CAUGHT_UP_TEXT}" at the end of the pool, in a slot of the same height`, async () => {
      const { rerender } = await render(row(true));
      const slotHeight = () =>
        StyleSheet.flatten(screen.getByTestId("row-end-slot").props.style)
          .height;
      expect(screen.queryByText(CAUGHT_UP_TEXT)).toBeNull();
      expect(slotHeight()).toBe(ROW_END_SLOT_HEIGHT);

      await rerender(row(false, true));
      expect(screen.queryByText(CAUGHT_UP_TEXT)).toBeNull();

      await rerender(row(false));
      expect(screen.getByText(CAUGHT_UP_TEXT)).toBeTruthy();
      expect(slotHeight()).toBe(ROW_END_SLOT_HEIGHT);
    });

    it("keeps the slot while the first load's skeleton cards show", async () => {
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
      expect(
        screen.getByTestId("row-end-slot", { includeHiddenElements: true }),
      ).toBeTruthy();
      expect(
        screen.queryByText(CAUGHT_UP_TEXT, { includeHiddenElements: true }),
      ).toBeNull();
    });

    it("counts the slot in the row's height", () => {
      expect(posterRowHeight(false)).toBe(
        25 + 8 + cardHeight(false) + 8 + ROW_END_SLOT_HEIGHT,
      );
    });
  });
});
