import { StyleSheet } from "react-native";
import { render, screen } from "@testing-library/react-native";

import { FOLLOWED_SHADE, PosterFollowCircle } from "./PosterFollowCircle";

jest.mock("@/hooks/useAccessibilityFlags", () => ({
  useAccessibilityFlags: () => ({ reduceMotionEnabled: true }),
}));

// Owner, 2026-10-22: a followed circle's fill a little darker than a
// circle not followed, on the cards and in Search alike.
describe("PosterFollowCircle", () => {
  const shade = () =>
    StyleSheet.flatten(screen.getByTestId("f-followed-shade").props.style)
      .opacity;

  it("darkens the fill once followed", async () => {
    await render(
      <PosterFollowCircle followed onPress={jest.fn()} testID="f" />,
    );
    expect(shade()).toBe(FOLLOWED_SHADE);
    expect(FOLLOWED_SHADE).toBeGreaterThan(0);
  });

  it("leaves the fill as it is when not followed", async () => {
    await render(
      <PosterFollowCircle followed={false} onPress={jest.fn()} testID="f" />,
    );
    expect(shade()).toBe(0);
  });
});
