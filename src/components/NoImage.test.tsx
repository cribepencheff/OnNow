import { StyleSheet } from "react-native";
import { render, screen } from "@testing-library/react-native";

import { NoImage } from "./NoImage";

// CRI-100 (owner, 2026-10-22): a show with no image anywhere gets a still,
// dark surface, unlike a skeleton's pulse, saying "No image" where there
// is room; too small for the words, just the surface.
describe("NoImage (CRI-100)", () => {
  it('says "No image"', async () => {
    await render(<NoImage />);
    expect(screen.getByText("No image")).toBeTruthy();
  });

  it("is only the surface where the words do not fit", async () => {
    await render(<NoImage label={false} />);
    expect(screen.queryByText("No image")).toBeNull();
    expect(screen.getByTestId("no-image")).toBeTruthy();
  });

  it("is a still gradient, not a skeleton", async () => {
    await render(<NoImage />);
    const surface = StyleSheet.flatten(
      screen.getByTestId("no-image").props.style,
    );
    expect(surface.experimental_backgroundImage).toContain("linear-gradient");
  });
});
