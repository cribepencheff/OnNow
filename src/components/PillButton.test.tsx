import { fireEvent, render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { PillButton, PILL_BUTTON_HEIGHT } from "./PillButton";

// CRI-131, CRI-143: Home's "Search more" and About's "More".
describe("PillButton", () => {
  it("is a button with its label that calls onPress", async () => {
    const onPress = jest.fn();
    await render(<PillButton label="More" onPress={onPress} />);
    await fireEvent.press(screen.getByRole("button", { name: "More" }));
    expect(onPress).toHaveBeenCalled();
  });

  it("is a small round pill with a hit area of at least 44", async () => {
    await render(<PillButton label="More" onPress={jest.fn()} testID="p" />);
    const pill = screen.getByTestId("p");
    const style = StyleSheet.flatten(pill.props.style);
    expect(style.height).toBe(PILL_BUTTON_HEIGHT);
    expect(style.borderRadius).toBe(PILL_BUTTON_HEIGHT / 2);
    expect(PILL_BUTTON_HEIGHT + 2 * pill.props.hitSlop).toBeGreaterThanOrEqual(
      44,
    );
  });

  it("does nothing when disabled", async () => {
    const onPress = jest.fn();
    await render(<PillButton label="More" onPress={onPress} disabled />);
    await fireEvent.press(screen.getByRole("button", { name: "More" }));
    expect(onPress).not.toHaveBeenCalled();
  });
});
