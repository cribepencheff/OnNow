import { StyleSheet, Text } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { ShowRow, ShowRowLine } from "./ShowRow";
import { type } from "@/theme/tokens";

// CRI-118: the one row behind Search, Shows and Calendar (PRD 5.2, 5.3,
// 5.4: "the same visual language").
describe("ShowRow", () => {
  it("shows the title, its lines and the trailing slot", async () => {
    await render(
      <ShowRow
        title="Slow Horses"
        posterUri="https://static.tvmaze.com/poster.jpg"
        accessibilityLabel="Slow Horses"
        trailing={<Text>circle</Text>}
        testID="row"
      >
        <ShowRowLine>S6E2 · Hello Goodbye</ShowRowLine>
      </ShowRow>,
    );

    expect(screen.getByText("Slow Horses")).toBeTruthy();
    expect(screen.getByText("S6E2 · Hello Goodbye")).toBeTruthy();
    expect(screen.getByText("circle")).toBeTruthy();
  });

  // Home layout polish: Shows and Search rows at the content inset.
  it("is inset by the content inset, 24", async () => {
    await render(
      <ShowRow
        title="Slow Horses"
        posterUri="https://static.tvmaze.com/poster.jpg"
        accessibilityLabel="Slow Horses"
        testID="row"
      >
        <ShowRowLine>S6E2 · Hello Goodbye</ShowRowLine>
      </ShowRow>,
    );
    let node = screen.getByText("Slow Horses").parent;
    while (
      node &&
      StyleSheet.flatten(node.props.style)?.paddingHorizontal === undefined
    ) {
      node = node.parent;
    }
    expect(StyleSheet.flatten(node?.props.style).paddingHorizontal).toBe(24);
  });

  it("is one button for screen readers, with the label it is given (NFR-008)", async () => {
    const onPress = jest.fn();
    await render(
      <ShowRow
        title="Slow Horses"
        accessibilityLabel="Slow Horses, S6E2 · Hello Goodbye"
        onPress={onPress}
        testID="row"
      />,
    );

    await fireEvent.press(
      screen.getByRole("button", { name: "Slow Horses, S6E2 · Hello Goodbye" }),
    );
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("keeps an empty line's height, so the row does not grow when it fills in", async () => {
    await render(<ShowRowLine testID="line">{""}</ShowRowLine>);

    expect(screen.getByTestId("line")).toHaveStyle({
      minHeight: type.meta.lineHeight,
    });
  });
});
