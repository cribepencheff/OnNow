import { StyleSheet, Text } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";

import { LOAD_MORE_PULL } from "@/logic/poster-batches";
import { CAUGHT_UP_TEXT, PosterRow, posterRowHeight } from "./PosterRow";
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

  // CRI-131: the end of the pool is a passive status on the title line.
  describe("the end of the pool (CRI-131)", () => {
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
    const status = () =>
      screen.getByTestId("row-caught-up", { includeHiddenElements: true });

    it(`says "${CAUGHT_UP_TEXT}" only at the end of the pool`, async () => {
      const { rerender } = await render(row(true));
      expect(screen.queryByText(CAUGHT_UP_TEXT)).toBeNull();

      await rerender(row(false, true));
      expect(screen.queryByText(CAUGHT_UP_TEXT)).toBeNull();

      await rerender(row(false));
      expect(screen.getByText(CAUGHT_UP_TEXT)).toBeTruthy();
    });

    it("sits on the title line, right-aligned on its baseline, laid out before it shows so the title never moves", async () => {
      await render(row(true));
      const line = status().parent;
      expect(line).toBeTruthy();
      expect(
        screen.getByRole("header", { name: "Airing this week" }).parent,
      ).toBe(status().parent);
      const lineStyle = StyleSheet.flatten(
        screen.getByRole("header").parent?.props.style,
      );
      expect(lineStyle.flexDirection).toBe("row");
      expect(lineStyle.alignItems).toBe("baseline");
      expect(StyleSheet.flatten(status().props.style).textAlign).toBe("right");
    });

    it("reads as passive status: muted, regular, smaller than the title, not a button", async () => {
      await render(row(false));
      const style = StyleSheet.flatten(status().props.style);
      const titleStyle = StyleSheet.flatten(
        screen.getByRole("header").props.style,
      );
      expect(style.fontSize).toBeLessThan(titleStyle.fontSize as number);
      expect(style.fontWeight).toBe("400");
      expect(style.color).not.toBe(titleStyle.color);
      expect(status().props.onPress).toBeUndefined();
      expect(screen.queryByRole("button", { name: CAUGHT_UP_TEXT })).toBeNull();
    });

    it("truncates before the title does on a narrow screen", async () => {
      await render(row(false));
      expect(status().props.numberOfLines).toBe(1);
      expect(StyleSheet.flatten(status().props.style).flex).toBe(1);
      expect(
        StyleSheet.flatten(screen.getByRole("header").props.style).flexShrink,
      ).toBe(0);
    });

    it("with an end action, shows a pill to tap there instead, only at the end", async () => {
      const onPress = jest.fn();
      const withAction = (hasMore: boolean) => (
        <PosterRow
          title="Top picks for you"
          isLoading={false}
          hasCards
          hasMore={hasMore}
          endAction={{ label: "Search more", onPress }}
          testID="row"
        >
          <Text>Lanterns</Text>
        </PosterRow>
      );
      const { rerender } = await render(withAction(true));
      expect(screen.queryByRole("button", { name: "Search more" })).toBeNull();

      await rerender(withAction(false));
      const pill = screen.getByRole("button", { name: "Search more" });
      expect(screen.queryByText(CAUGHT_UP_TEXT)).toBeNull();
      await fireEvent.press(pill);
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it("lays the pill out like the follow circle, centred on the title, with a 44 hit area, the title still winning", async () => {
      await render(
        <PosterRow
          title="Top picks for you"
          isLoading={false}
          hasCards
          endAction={{ label: "Search more", onPress: jest.fn() }}
          testID="row"
        >
          <Text>Lanterns</Text>
        </PosterRow>,
      );
      const pill = screen.getByTestId("row-end-action");
      const style = StyleSheet.flatten(pill.props.style);
      expect(style.height).toBe(32);
      expect(style.borderRadius).toBe(16);
      expect(32 + 2 * pill.props.hitSlop).toBeGreaterThanOrEqual(44);
      const header = screen.getByRole("header");
      expect(StyleSheet.flatten(header.parent?.props.style).alignItems).toBe(
        "center",
      );
      expect(StyleSheet.flatten(header.props.style).flexShrink).toBe(0);
      const label = screen.getByText("Search more");
      expect(label.props.numberOfLines).toBe(1);
    });

    it("leaves no slot under the row: the row is the space above, the heading and the cards", () => {
      expect(posterRowHeight(false)).toBe(32 + 25 + 8 + cardHeight(false));
    });
  });
});
