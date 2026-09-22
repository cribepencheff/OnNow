import { fireEvent, render, screen } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";

import { FollowCircle } from "./FollowCircle";

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light" },
}));

// PRD 5.4: hollow "+" when not followed, filled check with light haptic
// feedback when followed.
describe("FollowCircle", () => {
  beforeEach(() => {
    (Haptics.impactAsync as jest.Mock).mockClear();
  });

  it("calls onPress when tapped", async () => {
    const onPress = jest.fn();
    await render(<FollowCircle followed={false} onPress={onPress} />);

    fireEvent.press(screen.getByRole("button"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("triggers light haptic feedback when following", async () => {
    const onPress = jest.fn();
    await render(<FollowCircle followed={false} onPress={onPress} />);

    fireEvent.press(screen.getByRole("button"));

    expect(Haptics.impactAsync).toHaveBeenCalledWith(
      Haptics.ImpactFeedbackStyle.Light,
    );
  });

  it("does not trigger haptic feedback when unfollowing", async () => {
    const onPress = jest.fn();
    await render(<FollowCircle followed={true} onPress={onPress} />);

    fireEvent.press(screen.getByRole("button"));

    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });

  it("marks the circle as selected when followed", async () => {
    const onPress = jest.fn();
    await render(<FollowCircle followed={true} onPress={onPress} />);

    expect(screen.getByRole("button")).toBeSelected();
  });
});
