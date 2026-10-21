import { fireEvent, render, screen } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";

import { FollowCircle } from "./FollowCircle";

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light" },
}));

// PRD 5.4: hollow "+" when not followed, filled check when followed; the
// same haptics as every follow control: a light impact on follow, a
// lighter selection tick on unfollow.
describe("FollowCircle", () => {
  beforeEach(() => {
    (Haptics.impactAsync as jest.Mock).mockClear();
    (Haptics.selectionAsync as jest.Mock).mockClear();
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

  it("triggers a lighter selection haptic, not the impact, when unfollowing", async () => {
    const onPress = jest.fn();
    await render(<FollowCircle followed={true} onPress={onPress} />);

    fireEvent.press(screen.getByRole("button"));

    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });

  it("marks the circle as selected when followed", async () => {
    const onPress = jest.fn();
    await render(<FollowCircle followed={true} onPress={onPress} />);

    expect(screen.getByRole("button")).toBeSelected();
  });
});
