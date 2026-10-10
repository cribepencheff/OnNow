// A poster row opens and closes with an animated height (CRI-125).

import { StyleSheet, Text } from "react-native";
import { act, render, screen } from "@testing-library/react-native";

import { posterRowHeight } from "./PosterRow";
import { RowPresence } from "./RowPresence";
import { cardHeight } from "./ShowCard";

let mockReduceMotion = false;
jest.mock("@/hooks/useAccessibilityFlags", () => ({
  useAccessibilityFlags: () => ({
    reduceMotionEnabled: mockReduceMotion,
    screenReaderEnabled: false,
  }),
}));

const height = (testID: string) =>
  StyleSheet.flatten(screen.getByTestId(testID).props.style).height;

describe("RowPresence (CRI-125)", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    mockReduceMotion = false;
  });

  it("takes no room and shows nothing while hidden", async () => {
    await render(
      <RowPresence shown={false} height={300} testID="presence">
        <Text>Row</Text>
      </RowPresence>,
    );
    expect(height("presence")).toBe(0);
    expect(screen.queryByText("Row")).toBeNull();
  });

  it("opens to the row's full height when it gets content", async () => {
    const row = (shown: boolean) => (
      <RowPresence shown={shown} height={300} testID="presence">
        <Text>Row</Text>
      </RowPresence>
    );
    const { rerender } = await render(row(false));
    await rerender(row(true));
    expect(screen.getByText("Row")).toBeTruthy();

    await act(async () => jest.advanceTimersByTime(400));
    expect(height("presence")).toBe(300);
  });

  it("is open at once when it has content from the start (a cache)", async () => {
    await render(
      <RowPresence shown height={300} testID="presence">
        <Text>Row</Text>
      </RowPresence>,
    );
    expect(height("presence")).toBe(300);
  });

  it("opens at once with Reduce Motion on", async () => {
    mockReduceMotion = true;
    const row = (shown: boolean) => (
      <RowPresence shown={shown} height={300} testID="presence">
        <Text>Row</Text>
      </RowPresence>
    );
    const { rerender } = await render(row(false));
    await rerender(row(true));
    expect(height("presence")).toBe(300);
  });
});

describe("posterRowHeight (CRI-125)", () => {
  it("adds up the row's fixed parts", () => {
    // The space above, the heading, the gap and the cards (CRI-131: no
    // slot under them; the end of the pool is said on the title line).
    expect(posterRowHeight(false)).toBe(32 + 25 + 8 + cardHeight(false));
    expect(posterRowHeight(true) - posterRowHeight(false)).toBe(
      cardHeight(true) - cardHeight(false),
    );
  });
});
