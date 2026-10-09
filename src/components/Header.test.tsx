// The header over Home's hero (CRI-124).

import { Animated, Text } from "react-native";
import { act, render, screen } from "@testing-library/react-native";

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
});
