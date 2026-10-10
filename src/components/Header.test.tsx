// The header over Home's hero (CRI-124).

import { Animated, StyleSheet, Text } from "react-native";
import { act, render, screen } from "@testing-library/react-native";

import { t } from "@/theme/tokens";
import { Header } from "./Header";

describe("Header (CRI-124)", () => {
  it("shows its left and right slots", async () => {
    await render(<Header left={<Text>Logo</Text>} right={<Text>Me</Text>} />);
    expect(screen.getByText("Logo")).toBeTruthy();
    expect(screen.getByText("Me")).toBeTruthy();
  });

  it("is sharp at rest and during a pull, and blurs as it scrolls away", async () => {
    const scrollOffset = new Animated.Value(0);
    await render(
      <Header left={<Text>Logo</Text>} scrollOffset={scrollOffset} />,
    );
    expect(screen.queryByTestId("header-blur")).toBeNull();

    // A pull: the header stays as it is.
    await act(async () => scrollOffset.setValue(-80));
    expect(screen.queryByTestId("header-blur")).toBeNull();

    // Scrolled up, past the header (44 under a zero test inset).
    await act(async () => scrollOffset.setValue(30));
    expect(screen.getByTestId("header-blur")).toBeTruthy();
  });

  // Home layout polish: the header sits closer to the edge than the
  // content under it.
  it("uses the header inset, 16, smaller than the content inset", async () => {
    await render(<Header left={<Text>Logo</Text>} />);
    let node = screen.getByText("Logo").parent;
    while (
      node &&
      StyleSheet.flatten(node.props.style)?.paddingHorizontal === undefined
    ) {
      node = node.parent;
    }
    expect(StyleSheet.flatten(node?.props.style).paddingHorizontal).toBe(16);
    expect(t.headerInset).toBe(16);
    expect(t.contentInset).toBe(24);
  });
});
