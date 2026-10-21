import * as Haptics from "expo-haptics";

import { followHaptic } from "./followHaptic";

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light" },
}));

// PRD 5.4: every follow control gives the same haptics.
describe("followHaptic", () => {
  beforeEach(() => jest.clearAllMocks());

  it("gives a light impact on follow", () => {
    followHaptic(true);
    expect(Haptics.impactAsync).toHaveBeenCalledWith(
      Haptics.ImpactFeedbackStyle.Light,
    );
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
  });

  it("gives a lighter selection tick on unfollow", () => {
    followHaptic(false);
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });
});
