// The progressive blur over the hero's mirror zone (CRI-124): iOS only;
// Android blurs the mirrored image itself (HeroPage).

import { Platform } from "react-native";
import { render, screen } from "@testing-library/react-native";

import { ProgressiveBlur } from "./ProgressiveBlur";

describe("ProgressiveBlur (CRI-124)", () => {
  it("draws a masked blur on iOS", async () => {
    await render(<ProgressiveBlur intensity={80} testID="blur" />);
    expect(screen.getByTestId("blur")).toBeTruthy();
  });

  it("draws nothing on Android", async () => {
    jest.replaceProperty(Platform, "OS", "android");
    try {
      await render(<ProgressiveBlur intensity={80} testID="blur" />);
      expect(screen.queryByTestId("blur")).toBeNull();
    } finally {
      jest.restoreAllMocks();
    }
  });
});
